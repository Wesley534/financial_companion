# backend/routers/monthend.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.sql import func
from typing import Annotated, List, Dict
from datetime import datetime
from dateutil.relativedelta import relativedelta
import json

# Absolute Imports
from database import get_db
from models.user import User
from models.budget import Budget, Category
from models.transaction import Transaction
from models.goal import Goal
from models.monthly_report import MonthlyReport
from schemas.monthend import (
    WizardStep1Out, 
    WizardStep3In, 
    WizardStep4Out, 
    CategorySummary,
    MonthlyReportOut
)
from schemas.budget import BudgetOut
from security import get_current_user 
from routers.budget import calculate_budget_totals # Re-use the total calculation utility

router = APIRouter()

# --- Helper Functions (Month Logic) ---

def get_target_months(date_str: str) -> (str, str):
    """Returns the month string and the next month string (YYYY-MM)."""
    current_month_dt = datetime.strptime(date_str, "%Y-%m")
    next_month_dt = current_month_dt + relativedelta(months=1)
    return date_str, next_month_dt.strftime("%Y-%m")

async def get_month_data(db: AsyncSession, user_id: int, month: str) -> (Budget, List[Category]):
    """Fetches Budget and Categories for a given month, ensuring the budget exists."""
    budget_stmt = select(Budget).where(Budget.user_id == user_id, Budget.month == month)
    budget = (await db.execute(budget_stmt)).scalars().first()
    
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Budget not found for {month}.")
        
    category_stmt = select(Category).where(Category.user_id == user_id, Category.budget_month == month)
    categories = (await db.execute(category_stmt)).scalars().all()
    
    return budget, categories


# --- Endpoints ---

# Step 1: Summary of month (Includes Step 2: Surplus/Shortfall report)
@router.get("/wizard/summary", response_model=WizardStep1Out)
async def month_end_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    current_month = datetime.now().strftime("%Y-%m")
    
    # 1. Fetch current month's budget data
    budget, categories = await get_month_data(db, current_user.id, current_month)
    
    # 2. Recalculate totals to ensure categories' 'actual' fields are correct
    current_totals = await calculate_budget_totals(db, current_user.id, current_month)
    
    total_income = budget.income
    total_planned = current_totals['planned']
    total_actual = current_totals['actual']
    
    # 3. Create detailed breakdown and filter surplus/shortfall
    overspent_categories: List[CategorySummary] = []
    underspent_categories: List[CategorySummary] = []
    
    # Calculate total actual expenses (Needs + Wants)
    total_actual_expenses = 0.0
    
    for cat in categories:
        variance = cat.planned - cat.actual
        summary = CategorySummary(
            name=cat.name,
            type=cat.type,
            planned=cat.planned,
            actual=cat.actual,
            variance=variance
        )
        
        if cat.type != "Savings":
            total_actual_expenses += cat.actual
            
        if variance < 0:
            overspent_categories.append(summary)
        elif variance > 0:
            underspent_categories.append(summary)
            
    # Overall variance: Free-to-spend is income - planned, but this is the final calculation
    overall_variance = total_income - total_actual_expenses - budget.free_to_spend

    return WizardStep1Out(
        total_income=total_income,
        total_planned=total_planned,
        total_actual=total_actual,
        total_expenses=total_actual_expenses,
        overall_variance=overall_variance,
        overspent_categories=overspent_categories,
        underspent_categories=underspent_categories
    )


# Step 3: Sweep positive differences (Update Budget and Goal)
@router.post("/wizard/sweep", response_model=Dict[str, str])
async def month_end_sweep(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    sweep_data: WizardStep3In
):
    current_month = datetime.now().strftime("%Y-%m")
    
    # 1. Get current month's budget
    budget_stmt = select(Budget).where(Budget.user_id == current_user.id, Budget.month == current_month)
    budget = (await db.execute(budget_stmt)).scalars().first()
    
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current month budget not found.")
        
    sweep_amount = sweep_data.sweep_amount_to_goal

    # 2. Update Free-to-Spend
    # Logic: The sweep comes from the total net surplus, not directly from Free-to-Spend.
    # The actual surplus is calculated in Step 1. We assume the client sends a valid amount.
    
    # For simplicity, we will enforce that the sweep amount does not exceed the budget's income 
    # less current committed expenses. This is a complex logic better suited for a service layer.
    
    # Simple Logic: Move the sweep amount from the *theoretical* surplus to the target goal
    
    if sweep_data.goal_id:
        # A. Sweep to Goal
        goal = await get_validated_goal(db, current_user.id, sweep_data.goal_id)
        
        goal.saved_amount += sweep_amount
        db.add(goal)
        
        message = f"Successfully swept ${sweep_amount:.2f} to goal: {goal.name}."
        
    else:
        # B. Roll over to Next Month's Free-to-Spend (Done in Step 4)
        # For now, we just acknowledge the intended action.
        message = f"Acknowledged rollover of ${sweep_amount:.2f} to the next month's starting balance."
        
    # We don't commit here, because the final Budget update/creation happens in Step 4.
    # But for an idempotent endpoint, we should store this action. Let's just commit the goal update.
    if sweep_data.goal_id:
        await db.commit()
        
    return {"message": message}


# Step 4: Start new month (Create Monthly Report and New Budget)
@router.post("/wizard/start-new-month", response_model=WizardStep4Out)
async def month_end_start_new_month(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    prior_month: str # YYYY-MM of the month being closed
):
    # 1. Finalize the prior month's data
    prior_budget, prior_categories = await get_month_data(db, current_user.id, prior_month)
    prior_totals = await calculate_budget_totals(db, current_user.id, prior_month)
    
    # 2. Create the Monthly Report
    next_month = (datetime.strptime(prior_month, "%Y-%m") + relativedelta(months=1)).strftime("%Y-%m")
    
    # Re-fetch categories to get breakdown
    breakdown_list = []
    total_expenses = 0.0
    total_saved = 0.0
    
    for cat in prior_categories:
        summary = CategorySummary(name=cat.name, type=cat.type, planned=cat.planned, actual=cat.actual, variance=cat.planned - cat.actual)
        breakdown_list.append(summary)
        
        if cat.type == 'Savings':
            total_saved += cat.actual
        else:
            total_expenses += cat.actual
            
    # Net Surplus calculation (Income - Actual Spending (Excl. Savings))
    net_surplus = prior_budget.income - total_expenses - total_saved 

    new_report = MonthlyReport(
        user_id=current_user.id,
        month=prior_month,
        total_income=prior_budget.income,
        total_expenses=total_expenses,
        total_saved=total_saved,
        net_surplus=net_surplus,
        category_breakdown_json=json.dumps([s.model_dump() for s in breakdown_list]),
        insights_json="[]" # Placeholder
    )
    
    # 3. Create the New Budget
    
    # Carry over the free_to_spend balance (the rollover amount)
    # The final Free-to-Spend includes any previous rollover plus any unallocated budget this month
    new_starting_balance = prior_budget.starting_balance + prior_budget.free_to_spend
    
    # Create the new budget based on the prior one's settings
    new_budget = Budget(
        user_id=current_user.id,
        month=next_month,
        income=prior_budget.income,
        starting_balance=new_starting_balance,
        free_to_spend=new_starting_balance, # Free to spend is the carried over balance initially
        totals_json='{"planned": 0.0, "actual": 0.0, "difference": 0.0}'
    )
    
    # 4. Create New Categories (Duplicate planned from prior month)
    new_categories = []
    for cat in prior_categories:
        new_categories.append(
            Category(
                user_id=current_user.id,
                budget_month=next_month,
                name=cat.name,
                type=cat.type,
                planned=cat.planned,
                icon=cat.icon,
                color=cat.color
            )
        )
        
    # 5. Commit all
    db.add(new_report)
    db.add(new_budget)
    db.add_all(new_categories)
    await db.commit()
    await db.refresh(new_report)
    
    report_out = MonthlyReportOut.model_validate(new_report)
    report_out.category_breakdown = breakdown_list
    report_out.insights = []

    return WizardStep4Out(
        **report_out.model_dump(), # Inherit report data
        new_budget_month=next_month,
        new_free_to_spend=new_starting_balance
    )