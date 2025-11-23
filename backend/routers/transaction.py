from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.sql.expression import and_, extract
from typing import Annotated, List, Optional
from datetime import datetime
import json
from sqlalchemy.sql import func # Needed for aggregate function SUM

# Absolute Imports
from database import get_db
from models.user import User
from models.budget import Category, Budget
from models.transaction import Transaction
from schemas.transaction import (
    TransactionCreate, 
    TransactionUpdate, 
    TransactionOut,
    TransactionFilter,
    TransactionCategoryOut 
)
from schemas.budget import CategoryOut 
from security import get_current_user 

router = APIRouter()

# --- Utility Functions ---

async def update_category_actual(db: AsyncSession, category_id: int):
    """
    Recalculates and updates the 'actual' field for a given Category
    and updates the parent Budget's totals.
    """
    # 1. Calculate new actual spending for the category
    total_spending_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.category_id == category_id
        )
    )
    new_actual = total_spending_result.scalar() or 0.0

    # 2. Update the Category's actual amount (optional, mainly for caching/convenience)
    category_stmt = select(Category).where(Category.id == category_id)
    category = (await db.execute(category_stmt)).scalars().first()
    
    if not category: return # Category might have been deleted

    category.actual = new_actual
    db.add(category) # Add to session to mark as modified
    
    # 3. Update the parent Budget's totals
    budget_month = category.budget_month
    user_id = category.user_id
    
    budget_stmt = select(Budget).where(Budget.user_id == user_id, Budget.month == budget_month)
    budget = (await db.execute(budget_stmt)).scalars().first()
    
    if budget:
        # Recalculate all totals for the budget month
        
        all_categories_result = await db.execute(select(Category).where(
            Category.user_id == user_id, 
            Category.budget_month == budget_month
        ))
        all_categories = all_categories_result.scalars().all()
        
        # FIX: Using an explicit loop to resolve TypeError: 'async_generator' object is not iterable
        category_actuals = []
        for c in all_categories:
            amount_result = await db.execute(select(func.sum(Transaction.amount)).where(
                Transaction.category_id == c.id
            ))
            category_actuals.append(amount_result.scalar() or 0.0)
            
        total_actual = sum(category_actuals)
        
        total_planned = sum(c.planned for c in all_categories)
        
        new_totals = {
            "planned": total_planned,
            "actual": total_actual,
            "difference": total_planned - total_actual
        }
        
        budget.totals_json = json.dumps(new_totals)
        db.add(budget)
        
    await db.commit()


# --- Endpoints ---

# POST /transaction
@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    transaction_in: TransactionCreate
):
    # 1. Verify Category exists and belongs to the user (and get the month)
    category_stmt = select(Category).where(
        Category.id == transaction_in.category_id, 
        Category.user_id == current_user.id
    )
    category = (await db.execute(category_stmt)).scalars().first()

    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found or does not belong to user.")

    # 2. Determine budget_month from the transaction date
    transaction_month = transaction_in.date.strftime("%Y-%m")
    
    # 3. Verify Budget exists for the transaction month (optional, but good for data integrity)
    budget_stmt = select(Budget).where(
        Budget.user_id == current_user.id, 
        Budget.month == transaction_month
    )
    if not (await db.execute(budget_stmt)).scalars().first():
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"No budget exists for month {transaction_month}.")
    
    # 4. Create and add transaction
    new_transaction = Transaction(
        user_id=current_user.id,
        budget_month=transaction_month,
        **transaction_in.model_dump(),
        # AI confidence is 0.0 unless set by a POST /ai/categorize endpoint call
    )
    
    db.add(new_transaction)
    await db.flush() # Flush to get the ID for the next step (update_category_actual)

    # 5. Update Category and Budget actuals
    await update_category_actual(db, new_transaction.category_id)
    
    # Refetch to include the category name/color for the response (due to missing relationship setup)
    new_transaction.category = category 
    
    # The transaction_in.date is already a date object, so model_validate works here.
    return TransactionOut.model_validate(new_transaction)


# GET /transactions (List and Filter)
@router.get("", response_model=List[TransactionOut])
async def get_transactions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    filters: Annotated[TransactionFilter, Depends()],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100)
):
    # 1. Build the WHERE clause
    conditions = [Transaction.user_id == current_user.id]

    if filters.category_id is not None:
        conditions.append(Transaction.category_id == filters.category_id)
    if filters.min_amount is not None:
        conditions.append(Transaction.amount >= filters.min_amount)
    if filters.max_amount is not None:
        conditions.append(Transaction.amount <= filters.max_amount)
    if filters.start_date is not None:
        conditions.append(Transaction.date >= filters.start_date)
    if filters.end_date is not None:
        conditions.append(Transaction.date <= filters.end_date)
    if filters.recurring is not None:
        conditions.append(Transaction.recurring == filters.recurring)
    if filters.month is not None:
        conditions.append(Transaction.budget_month == filters.month)

    # 2. Build the query statement
    stmt = (
        select(Transaction, Category)
        .join(Category, Transaction.category_id == Category.id)
        .where(and_(*conditions))
        .order_by(Transaction.date.desc())
        .offset(skip)
        .limit(limit)
    )

    # 3. Execute the query
    results = await db.execute(stmt)
    # Get tuples of (Transaction, Category)
    transactions_with_categories = results.all() 
    
    # 4. Map results to TransactionOut schema
    transaction_outs = []
    
    for transaction, category in transactions_with_categories:
        
        category_out = TransactionCategoryOut.model_validate(category) 
        
        # Construct the final TransactionOut object
        transaction_data = transaction.__dict__.copy()
        
        # FIX START: Convert SQLAlchemy model's date (which is a datetime object) to a date object 
        # to satisfy the TransactionOut schema's date_type field.
        if isinstance(transaction_data.get('date'), datetime):
             transaction_data['date'] = transaction_data['date'].date()
        # FIX END
        
        transaction_data['category'] = category_out
        transaction_outs.append(TransactionOut.model_validate(transaction_data))
    
    return transaction_outs


# GET /transactions/{id}
@router.get("/{transaction_id}", response_model=TransactionOut)
async def get_transaction(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    transaction_id: int
):
    stmt = (
        select(Transaction, Category)
        .join(Category, Transaction.category_id == Category.id)
        .where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    )
    result = (await db.execute(stmt)).first()

    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")

    transaction, category = result
    
    # Map to output schema
    category_out = TransactionCategoryOut.model_validate(category)
    transaction_out_dict = transaction.__dict__.copy()
    
    # FIX START: Convert SQLAlchemy model's date (which is a datetime object) to a date object 
    if isinstance(transaction_out_dict.get('date'), datetime):
         transaction_out_dict['date'] = transaction_out_dict['date'].date()
    # FIX END
    
    transaction_out_dict['category'] = category_out
    
    return TransactionOut.model_validate(transaction_out_dict)


# PATCH /transaction/{id}
@router.patch("/{transaction_id}", response_model=TransactionOut)
async def update_transaction(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    transaction_id: int,
    transaction_update: TransactionUpdate
):
    # 1. Get the existing transaction
    stmt = select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    transaction = (await db.execute(stmt)).scalars().first()

    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")

    # Store old category_id for recalculation
    old_category_id = transaction.category_id 
    
    # 2. Apply updates
    update_data = transaction_update.model_dump(exclude_unset=True)
    if not update_data:
        return await get_transaction(current_user, db, transaction_id) # Re-fetch and return
    
    # Handle category_id change (must be validated)
    if 'category_id' in update_data and update_data['category_id'] != old_category_id:
        new_category_id = update_data['category_id']
        category_stmt = select(Category).where(Category.id == new_category_id, Category.user_id == current_user.id)
        if not (await db.execute(category_stmt)).scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New category ID is invalid.")
            
    # Apply all updates
    for key, value in update_data.items():
        setattr(transaction, key, value)
    
    # 3. Commit update
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    
    # 4. Recalculate 'actual' spending for affected categories
    await update_category_actual(db, transaction.category_id)
    if transaction.category_id != old_category_id:
        await update_category_actual(db, old_category_id) # Also recalculate the old category

    # 5. Return the updated transaction
    return await get_transaction(current_user, db, transaction_id)


# DELETE /transaction/{id}
@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    transaction_id: int
):
    # 1. Get the existing transaction
    stmt = select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    transaction = (await db.execute(stmt)).scalars().first()

    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")
        
    category_id_to_update = transaction.category_id
    
    # 2. Delete the transaction
    await db.delete(transaction)
    await db.commit()
    
    # 3. Recalculate 'actual' spending for the affected category
    await update_category_actual(db, category_id_to_update)
    
    return