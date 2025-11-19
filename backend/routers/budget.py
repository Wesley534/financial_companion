# backend/routers/budget.py (UPDATED)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Annotated, List
from datetime import datetime

# Absolute Imports
from database import get_db
from models.user import User # User model is imported
from models.budget import Budget, Category
from schemas.budget import BudgetInitialSetup, BudgetOut, CategoryCreate
from security import get_current_user 

router = APIRouter()

# Helper function for 50/30/20 allocation (No changes needed)
def get_default_categories(user_id: int, month: str, income: float) -> List[Category]:
    """Generates default 50/30/20 categories (Needs: 50%, Wants: 30%, Savings: 20%)"""
    needs_amount = income * 0.50
    wants_amount = income * 0.30
    savings_amount = income * 0.20
    
    categories = [
        # Needs (50%)
        Category(user_id=user_id, budget_month=month, name="Housing", type="Need", planned=needs_amount * 0.4, icon="home", color="#0f9d58"),
        Category(user_id=user_id, budget_month=month, name="Groceries", type="Need", planned=needs_amount * 0.3, icon="shopping-bag", color="#0f9d58"),
        Category(user_id=user_id, budget_month=month, name="Utilities", type="Need", planned=needs_amount * 0.3, icon="zap", color="#0f9d58"),
        
        # Wants (30%)
        Category(user_id=user_id, budget_month=month, name="Entertainment", type="Want", planned=wants_amount * 0.5, icon="film", color="#ED254E"),
        Category(user_id=user_id, budget_month=month, name="Dining Out", type="Want", planned=wants_amount * 0.5, icon="utensils", color="#ED254E"),
        
        # Savings (20%)
        Category(user_id=user_id, budget_month=month, name="Goal Contribution", type="Savings", planned=savings_amount, icon="piggy-bank", color="#F5BB00"),
    ]
    return categories


# POST /budget/setup (Endpoint for First-Time Setup Wizard)
@router.post("/setup", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
async def initial_budget_setup(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    setup_data: BudgetInitialSetup
):
    user_id = current_user.id
    current_month = datetime.now().strftime("%Y-%m")
    
    # 1. Check if a budget already exists for the month
    existing_budget = (await db.execute(select(Budget).where(Budget.user_id == user_id, Budget.month == current_month))).scalars().first()
    if existing_budget or current_user.is_setup_complete: # Check setup status as well
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Budget already exists for {current_month} or setup is complete. Proceed to dashboard."
        )

    # 2. Determine and Create Categories
    # ... (Category creation logic remains the same) ...
    if setup_data.allocation_method == "50/30/20":
        new_categories = get_default_categories(user_id, current_month, setup_data.income)
    else:
        # For MVP, we will treat Manual as 50/30/20 or fallback to a single category if no input
        if setup_data.initial_categories:
             new_categories = [
                Category(
                    user_id=user_id, 
                    budget_month=current_month, 
                    name=cat.name, 
                    type=cat.type, 
                    planned=cat.planned,
                    icon=cat.icon,
                    color=cat.color
                ) 
                for cat in setup_data.initial_categories
            ]
        else:
            new_categories = [
                Category(user_id=user_id, budget_month=current_month, name="Unallocated", type="Need", planned=setup_data.income, icon="dollar-sign", color="#999999")
            ]
            
    # Calculate total planned expense (Zero-based logic)
    total_planned_expenses = sum(cat.planned for cat in new_categories)
    free_to_spend = setup_data.income - total_planned_expenses
    
    # 3. Create the Budget object
    new_budget = Budget(
        user_id=user_id,
        month=current_month,
        income=setup_data.income,
        starting_balance=setup_data.starting_balance,
        free_to_spend=free_to_spend 
    )
    
    # 4. Update the User model's setup status (CRUCIAL STEP)
    current_user.is_setup_complete = True
    
    # 5. Commit all to DB
    # We use db.add for the User object because it's a transient object (loaded via relationship)
    db.add(new_budget) 
    db.add_all(new_categories)
    db.add(current_user) # Add the modified user object back to the session
    
    await db.commit()
    await db.refresh(new_budget)
    # Note: A successful commit means the user record is updated, so the next /auth/me call
    # will reflect the change, allowing the frontend to redirect.
    
    return new_budget