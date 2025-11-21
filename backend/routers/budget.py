# backend/routers/budget.py (Complete Module with Transaction Integration)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.sql import func 
from typing import Annotated, List, Dict
from datetime import datetime
import json

# Absolute Imports
from database import get_db
from models.user import User 
from models.budget import Budget, Category
from models.transaction import Transaction 
from schemas.budget import (
    BudgetInitialSetup, 
    BudgetOut, 
    CategoryCreate, 
    CategoryOut, 
    BudgetUpdate,
    MonthlyBudgetOut,
    CategoryUpdate
)
from security import get_current_user 

router = APIRouter()

# --- Helper Functions (REAL LOGIC) ---

async def calculate_actual_spending(db: AsyncSession, category_id: int) -> float:
    """Calculates the actual spending for a category by summing transactions."""
    total_spending_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.category_id == category_id
        )
    )
    # Assuming Transaction.amount stores positive value for expense
    return total_spending_result.scalar() or 0.0

async def calculate_budget_totals(db: AsyncSession, user_id: int, month: str) -> Dict[str, float]:
    """
    Calculates total planned/actual spending across all categories for a month.
    Also updates the 'actual' field on each Category object in the session.
    """
    
    # 1. Get all categories for the month
    category_stmt = select(Category).where(Category.user_id == user_id, Category.budget_month == month)
    categories = (await db.execute(category_stmt)).scalars().all()
    
    total_planned = sum(c.planned for c in categories)
    total_actual = 0.0
    
    # 2. Calculate actual for each category and sum the total actual
    for cat in categories:
        actual = await calculate_actual_spending(db, cat.id)
        cat.actual = actual # <-- Update model object's actual
        total_actual += actual
        db.add(cat) # Add to session to mark as modified for refresh/commit
    
    difference = total_planned - total_actual
    
    return {"planned": total_planned, "actual": total_actual, "difference": difference}


# Helper function for 50/30/20 allocation (REMAINS THE SAME)
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

# --- Budget Endpoints ---

# POST /budget/setup (Endpoint for First-Time Setup Wizard)
@router.post("/setup", response_model=BudgetOut, status_code=status.HTTP_201_CREATED, tags=["Setup"])
async def initial_budget_setup(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    setup_data: BudgetInitialSetup
):
    user_id = current_user.id
    current_month = datetime.now().strftime("%Y-%m")
    
    # 1. Check if a budget already exists
    existing_budget = (await db.execute(select(Budget).where(Budget.user_id == user_id, Budget.month == current_month))).scalars().first()
    if existing_budget or current_user.is_setup_complete:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Budget already exists for {current_month} or setup is complete."
        )

    # 2. Determine and Create Categories
    if setup_data.allocation_method == "50/30/20":
        new_categories = get_default_categories(user_id, current_month, setup_data.income)
    else:
        # Manual allocation logic as previously defined
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
            
    # Calculate total planned expense and free_to_spend
    total_planned_expenses = sum(cat.planned for cat in new_categories)
    free_to_spend = setup_data.income - total_planned_expenses
    
    # 3. Commit categories first to get IDs, then calculate totals
    db.add_all(new_categories)
    await db.flush() # IMPORTANT: Flush to assign IDs before calculating totals
    
    # Calculate initial totals JSON (NOW USES ASYNC REAL LOGIC)
    initial_totals = await calculate_budget_totals(db, user_id, current_month) 
    
    # 4. Create the Budget object
    new_budget = Budget(
        user_id=user_id,
        month=current_month,
        income=setup_data.income,
        starting_balance=setup_data.starting_balance,
        free_to_spend=free_to_spend,
        totals_json=json.dumps(initial_totals) # Store JSON totals
    )
    
    # 5. Update the User model's setup status and commit
    current_user.is_setup_complete = True
    db.add(new_budget) 
    db.add(current_user)
    
    await db.commit()
    await db.refresh(new_budget)
    
    # *** CORRECTION FOR PYDANTIC VALIDATION ***
    # Manually construct the BudgetOut response dictionary
    budget_data_for_pydantic = {
        'id': new_budget.id,
        'month': new_budget.month,
        'income': new_budget.income,
        'starting_balance': new_budget.starting_balance,
        'free_to_spend': new_budget.free_to_spend,
        'totals': initial_totals, # Inject the calculated data
    }
    # Return a BudgetOut model that includes the parsed totals
    return BudgetOut(**budget_data_for_pydantic)
    # *** END CORRECTION ***


# Helper function to fetch and format budget data
async def fetch_budget_data(db: AsyncSession, user_id: int, month: str) -> MonthlyBudgetOut:
    """Fetches Budget and its associated Categories for a given month."""
    
    # 1. Fetch Budget
    budget_stmt = select(Budget).where(Budget.user_id == user_id, Budget.month == month)
    budget = (await db.execute(budget_stmt)).scalars().first()

    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Budget not found for {month}")

    # 2. Calculate/Update Actuals and Totals (REAL LOGIC)
    new_totals = await calculate_budget_totals(db, user_id, month) 
    
    # Refresh categories to get the newly set 'actual' value
    category_stmt = select(Category).where(Category.user_id == user_id, Category.budget_month == month)
    categories = (await db.execute(category_stmt)).scalars().all()
    
    category_outs = [CategoryOut.model_validate(cat) for cat in categories]

    # Update budget object and persist totals_json
    budget.totals_json = json.dumps(new_totals)
    
    # *** CORRECTION FOR PYDANTIC VALIDATION ***
    # Manually construct the MonthlyBudgetOut response dictionary
    budget_data_for_pydantic = {
        'id': budget.id,
        'month': budget.month,
        'income': budget.income,
        'starting_balance': budget.starting_balance,
        'free_to_spend': budget.free_to_spend,
        'totals': new_totals, # Inject the parsed/calculated data
        'categories': category_outs # Inject the list of categories
    }
    
    # 3. Return the combined model
    return MonthlyBudgetOut(**budget_data_for_pydantic)
    # *** END CORRECTION ***


# GET /budget/current
@router.get("/current", response_model=MonthlyBudgetOut)
async def get_current_budget(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    current_month = datetime.now().strftime("%Y-%m")
    return await fetch_budget_data(db, current_user.id, current_month)


# GET /budget/{month}
@router.get("/{month}", response_model=MonthlyBudgetOut)
async def get_budget_by_month(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    month: str # Expects format YYYY-MM
):
    return await fetch_budget_data(db, current_user.id, month)


# PATCH /budget/update (For income, starting_balance)
@router.patch("/update", response_model=BudgetOut)
async def update_budget_details(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    update_data: BudgetUpdate
):
    current_month = datetime.now().strftime("%Y-%m")
    
    # 1. Get the existing budget
    budget_stmt = select(Budget).where(Budget.user_id == current_user.id, Budget.month == current_month)
    budget = (await db.execute(budget_stmt)).scalars().first()
    
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current month budget not found.")

    # 2. Apply updates
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(budget, key, value)
    
    # 3. Recalculate free_to_spend and totals
    total_planned = (await db.execute(
        select(func.sum(Category.planned)).where(Category.user_id == current_user.id, Category.budget_month == current_month)
    )).scalar() or 0.0

    budget.free_to_spend = budget.income - total_planned
    
    new_totals = await calculate_budget_totals(db, current_user.id, current_month) # Recalculates actuals and updates categories/budget
    budget.totals_json = json.dumps(new_totals)
    
    # 4. Commit and Refresh
    await db.commit()
    await db.refresh(budget)
    
    # *** CORRECTION FOR PYDANTIC VALIDATION ***
    # Manually construct the BudgetOut response dictionary
    budget_data_for_pydantic = {
        'id': budget.id,
        'month': budget.month,
        'income': budget.income,
        'starting_balance': budget.starting_balance,
        'free_to_spend': budget.free_to_spend,
        'totals': new_totals, # Inject the calculated data
    }
    return BudgetOut(**budget_data_for_pydantic)
    # *** END CORRECTION ***

# --- Category Endpoints ---

# POST /category
@router.post("/category", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    category_in: CategoryCreate
):
    current_month = datetime.now().strftime("%Y-%m")
    
    # 1. Verify budget exists
    budget_stmt = select(Budget).where(Budget.user_id == current_user.id, Budget.month == current_month)
    budget = (await db.execute(budget_stmt)).scalars().first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot add category: Budget for current month not found.")
    
    # 2. Create and add category
    new_category = Category(
        user_id=current_user.id,
        budget_month=current_month,
        **category_in.model_dump()
    )
    db.add(new_category)
    await db.flush() # Flush to get ID before recalculating totals
    
    # 3. Recalculate and update Budget free_to_spend and totals
    total_planned = (await db.execute(
        select(func.sum(Category.planned)).where(Category.user_id == current_user.id, Category.budget_month == current_month)
    )).scalar() or 0.0
    
    budget.free_to_spend = budget.income - total_planned
    budget.totals_json = json.dumps(await calculate_budget_totals(db, current_user.id, current_month))
    
    await db.commit()
    await db.refresh(new_category)
    
    return CategoryOut.model_validate(new_category)


# PATCH /category/update/{id}
@router.patch("/category/update/{category_id}", response_model=CategoryOut)
async def update_category(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    category_id: int,
    category_update: CategoryUpdate
):
    # 1. Get the existing category
    stmt = select(Category).where(Category.id == category_id, Category.user_id == current_user.id)
    category = (await db.execute(stmt)).scalars().first()

    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    # 2. Apply updates
    update_data = category_update.model_dump(exclude_unset=True)
    if not update_data:
        # Fetch current actual spending before returning for full CategoryOut object
        category.actual = await calculate_actual_spending(db, category.id)
        return CategoryOut.model_validate(category) 
        
    for key, value in update_data.items():
        setattr(category, key, value)
    
    # 3. Commit category update
    await db.commit()
    await db.refresh(category)
    
    # 4. Recalculate and update Budget free_to_spend and totals (if 'planned' changed)
    if 'planned' in update_data:
        current_month = category.budget_month
        budget_stmt = select(Budget).where(Budget.user_id == current_user.id, Budget.month == current_month)
        budget = (await db.execute(budget_stmt)).scalars().first()
        
        if budget:
            total_planned = (await db.execute(
                select(func.sum(Category.planned)).where(Category.user_id == current_user.id, Category.budget_month == current_month)
            )).scalar() or 0.0
            
            budget.free_to_spend = budget.income - total_planned
            budget.totals_json = json.dumps(await calculate_budget_totals(db, current_user.id, current_month))
            await db.commit()
    
    # Update actual before returning
    category.actual = await calculate_actual_spending(db, category.id)
    return CategoryOut.model_validate(category)


# DELETE /category/{id}
@router.delete("/category/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    category_id: int
):
    # 1. Find category
    stmt = select(Category).where(Category.id == category_id, Category.user_id == current_user.id)
    category = (await db.execute(stmt)).scalars().first()

    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
        
    category_month = category.budget_month
    
    # 2. Check for linked transactions
    actual_spending = await calculate_actual_spending(db, category_id)
    if actual_spending > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with linked transactions."
        )

    # 3. Delete category
    await db.execute(delete(Category).where(Category.id == category_id))
    
    # 4. Recalculate and update Budget free_to_spend and totals
    budget_stmt = select(Budget).where(Budget.user_id == current_user.id, Budget.month == category_month)
    budget = (await db.execute(budget_stmt)).scalars().first()
    
    if budget:
        # Commit deletion first to ensure calculations are correct
        await db.commit()
        
        total_planned = (await db.execute(
            select(func.sum(Category.planned)).where(Category.user_id == current_user.id, Category.budget_month == category_month)
        )).scalar() or 0.0
        
        budget.free_to_spend = budget.income - total_planned
        budget.totals_json = json.dumps(await calculate_budget_totals(db, current_user.id, category_month))
        await db.commit()
        
    return