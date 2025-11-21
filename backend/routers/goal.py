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

# --- Dependencies ---

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
    
    # Use the custom validator to calculate progress_percent
    return [GoalOut.model_validate(goal) for goal in goals]


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
    
    return GoalOut.model_validate(new_goal)


# GET /goal/{id}
@router.get("/{goal_id}", response_model=GoalOut)
async def get_goal(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    goal_id: int
):
    goal = await get_validated_goal(db, current_user.id, goal_id)
    return GoalOut.model_validate(goal)


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
    
    return GoalOut.model_validate(goal)


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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current month budget not found. Cannot determine available funds.")
        
    # 2. Validation: Check if free_to_spend is sufficient
    contribution_amount = contribution.amount
    
    if contribution_amount > budget.free_to_spend:
        # Note: In a real app, this should be a soft warning/dialog on the frontend.
        # Here, we enforce the hard limit for a clean transaction.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Contribution amount (${contribution_amount:.2f}) exceeds current 'Free-to-Spend' balance (${budget.free_to_spend:.2f})."
        )

    # 3. Update Goal: Increase saved_amount
    goal.saved_amount += contribution_amount
    
    # 4. Update Budget: Decrease free_to_spend
    budget.free_to_spend -= contribution_amount
    
    # 5. Commit changes
    db.add(goal)
    db.add(budget)
    await db.commit()
    
    # Optionally: Record this as a Transaction tagged to the main Savings Category
    # Since this is a system-level transfer, we will skip recording a Transaction for now
    # to avoid double-counting, as the money is already *in* the system.
    
    # But for dashboard health, we might *want* to record a transaction to move money 
    # from 'Free-to-Spend' into the 'Savings' category's actual amount.
    
    # To keep it simple for now, we only update the Goal/Budget models.
    
    return {"message": f"Successfully contributed ${contribution_amount:.2f} to {goal.name}.", "new_saved_amount": goal.saved_amount}