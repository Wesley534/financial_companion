# backend/routers/goal.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import Annotated, List, Dict
from datetime import datetime
import json

# Absolute Imports
from database import get_db
from models.user import User
from models.goal import Goal
from models.budget import Budget # Need to check Free-to-Spend
from schemas.goal import (
    GoalCreate, 
    GoalUpdate, 
    GoalOut, 
    ContributionRequest
)
from security import get_current_user 

router = APIRouter()

# --- Helper Functions ---

def calculate_goal_progress(goal: Goal) -> float:
    """Calculates the progress percentage for a Goal ORM object."""
    if goal.target_amount is None or goal.target_amount == 0:
        return 0.0
    return min(100.0, (goal.saved_amount / goal.target_amount) * 100)

# The Pydantic validator needs to receive a dictionary with the calculated field.
def create_goal_out_data(goal: Goal) -> Dict:
    """Creates a dictionary suitable for GoalOut.model_validate."""
    goal_data = goal.__dict__.copy()
    goal_data['progress_percent'] = calculate_goal_progress(goal)
    return goal_data


async def get_validated_goal(db: AsyncSession, user_id: int, goal_id: int) -> Goal:
    """Fetches a goal and ensures it belongs to the user."""
    stmt = select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
    goal = (await db.execute(stmt)).scalars().first()
    
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings Goal not found.")
        
    return goal

# --- Endpoints ---

# GET /goals
@router.get("", response_model=List[GoalOut])
async def get_all_goals(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    stmt = select(Goal).where(Goal.user_id == current_user.id).order_by(Goal.target_amount.desc())
    goals = (await db.execute(stmt)).scalars().all()
    
    # FIX START: Inject the calculated progress_percent into the data dict before validation
    return [GoalOut.model_validate(create_goal_out_data(goal)) for goal in goals]
    # FIX END


# POST /goal
@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
async def create_goal(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    goal_in: GoalCreate
):
    # 1. Create the Goal model
    new_goal = Goal(
        user_id=current_user.id,
        saved_amount=0.0,
        **goal_in.model_dump(exclude_none=True)
    )
    
    # 2. Commit and return
    db.add(new_goal)
    await db.commit()
    await db.refresh(new_goal)
    
    # FIX START: Inject the calculated progress_percent into the data dict before validation
    return GoalOut.model_validate(create_goal_out_data(new_goal))
    # FIX END


# GET /goal/{id}
@router.get("/{goal_id}", response_model=GoalOut)
async def get_goal(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    goal_id: int
):
    goal = await get_validated_goal(db, current_user.id, goal_id)
    # FIX START: Inject the calculated progress_percent into the data dict before validation
    return GoalOut.model_validate(create_goal_out_data(goal))
    # FIX END


# PATCH /goal/{id}
@router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    goal_id: int,
    goal_update: GoalUpdate
):
    goal = await get_validated_goal(db, current_user.id, goal_id)

    # 1. Apply updates
    update_data = goal_update.model_dump(exclude_unset=True)
        
    for key, value in update_data.items():
        setattr(goal, key, value)
        
    # 2. Commit and return
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    
    # FIX START: Inject the calculated progress_percent into the data dict before validation
    return GoalOut.model_validate(create_goal_out_data(goal))
    # FIX END


# DELETE /goal/{id}
@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    goal_id: int
):
    goal = await get_validated_goal(db, current_user.id, goal_id)
    
    await db.delete(goal)
    await db.commit()
    
    return


# POST /goal/{id}/contribute (The Sweep Surplus/Manual Contribution Endpoint)
@router.post("/{goal_id}/contribute", status_code=status.HTTP_200_OK)
async def contribute_to_goal(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    goal_id: int,
    contribution: ContributionRequest
):
    goal = await get_validated_goal(db, current_user.id, goal_id)
    current_month = datetime.now().strftime("%Y-%m")
    
    # 1. Check current month's budget to get Free-to-Spend
    budget_stmt = select(Budget).where(
        Budget.user_id == current_user.id, 
        Budget.month == current_month
    )
    budget = (await db.execute(budget_stmt)).scalars().first()
    
    if not budget:
        # NOTE: Keeping this error as it's a fundamental data integrity check,
        # but removing the *insufficiency* check.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current month budget not found. Cannot update available funds.")
        
    # 2. Validation: Check if free_to_spend is sufficient
    contribution_amount = contribution.amount
    
    # REMOVED: The check that raises HTTPException if contribution_amount > budget.free_to_spend
    # This allows a user to "over-contribute" from Free-to-Spend, resulting in a negative Free-to-Spend balance.

    # 3. Update Goal: Increase saved_amount
    goal.saved_amount += contribution_amount
    
    # 4. Update Budget: Decrease free_to_spend
    budget.free_to_spend -= contribution_amount
    
    # 5. Commit changes
    db.add(goal)
    db.add(budget)
    await db.commit()
    
    return {"message": f"Successfully contributed ${contribution_amount:.2f} to {goal.name}.", "new_saved_amount": goal.saved_amount}