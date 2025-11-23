# backend/routers/shopping.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import Annotated, List
from datetime import datetime
import json

# Absolute Imports
from database import get_db
from models.user import User
from models.budget import Category
from models.shopping import ShoppingList
from models.transaction import Transaction # For the Checkout endpoint
from schemas.shopping import (
    ShoppingListCreate, 
    ShoppingListUpdate, 
    ShoppingListOut, 
    CheckoutRequest,
)
from schemas.transaction import TransactionCreate # For the Checkout endpoint
from security import get_current_user 
from routers.transaction import update_category_actual # Re-use the utility function

router = APIRouter()

# --- Utility Function ---
async def get_validated_shopping_list(db: AsyncSession, user_id: int, list_id: int) -> ShoppingList:
    """Fetches a shopping list and ensures it belongs to the user."""
    stmt = select(ShoppingList).where(ShoppingList.id == list_id, ShoppingList.user_id == user_id)
    shopping_list = (await db.execute(stmt)).scalars().first()
    
    if not shopping_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopping list not found.")
        
    return shopping_list

# --- Endpoints ---

# GET /shopping-lists
@router.get("", response_model=List[ShoppingListOut])
async def get_all_shopping_lists(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    stmt = select(ShoppingList).where(ShoppingList.user_id == current_user.id).order_by(ShoppingList.created_at.desc())
    lists = (await db.execute(stmt)).scalars().all()
    
    # Use the custom validator to include calculated fields and parsed items
    return [ShoppingListOut.model_validate_shopping_list(lst) for lst in lists]


# POST /shopping-list
@router.post("", response_model=ShoppingListOut, status_code=status.HTTP_201_CREATED)
async def create_shopping_list(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    list_in: ShoppingListCreate
):
    # 1. Verify Category exists and belongs to the user
    category_stmt = select(Category).where(Category.id == list_in.category_id, Category.user_id == current_user.id)
    if not (await db.execute(category_stmt)).scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found or does not belong to user.")
        
    # 2. Create the ShoppingList model
    new_list = ShoppingList(
        user_id=current_user.id,
        name=list_in.name,
        category_id=list_in.category_id,
        items_json=json.dumps([item.model_dump() for item in list_in.items]) # Store items as JSON string
    )
    
    # 3. Commit and return
    db.add(new_list)
    await db.commit()
    await db.refresh(new_list)
    
    return ShoppingListOut.model_validate_shopping_list(new_list)


# GET /shopping-list/{id}
@router.get("/{list_id}", response_model=ShoppingListOut)
async def get_shopping_list(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    list_id: int
):
    shopping_list = await get_validated_shopping_list(db, current_user.id, list_id)
    return ShoppingListOut.model_validate_shopping_list(shopping_list)


# PATCH /shopping-list/{id}
@router.patch("/{list_id}", response_model=ShoppingListOut)
async def update_shopping_list(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    list_id: int,
    list_update: ShoppingListUpdate
):
    shopping_list = await get_validated_shopping_list(db, current_user.id, list_id)

    # 1. Apply updates
    update_data = list_update.model_dump(exclude_unset=True)
    
    if 'category_id' in update_data:
        # Verify New Category ID
        category_stmt = select(Category).where(Category.id == update_data['category_id'], Category.user_id == current_user.id)
        if not (await db.execute(category_stmt)).scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New category ID is invalid.")
            
    if 'items' in update_data:
        # FIX: Access the list of Pydantic models directly from the list_update object
        # before the outer model_dump converts 'items' into a list of dicts.
        # This assumes the item list is stored in the list_update object under 'items' 
        # and contains the original Pydantic models.
        items_to_dump = list_update.items 
        
        # If the outer model_dump was used, the items list in update_data is already a list of dicts.
        # We need to detect this and handle both cases or change the dump logic.
        
        # Safer Fix: Check if the original list_update Pydantic model contains the items field 
        # and it's set (i.e., passed in the request body), then use that.
        if 'items' in list_update.model_fields_set:
            items_to_dump = list_update.items
            
            # Convert List[ShoppingListItem] back to JSON string
            # list_update.items contains the Pydantic models from validation.
            # We call model_dump() on them here.
            update_data['items_json'] = json.dumps([item.model_dump() for item in items_to_dump])
            del update_data['items'] # Remove the original 'items' key from update_data

        
    for key, value in update_data.items():
        setattr(shopping_list, key, value)
        
    # 2. Commit and return
    db.add(shopping_list)
    await db.commit()
    await db.refresh(shopping_list)
    
    return ShoppingListOut.model_validate_shopping_list(shopping_list)


# DELETE /shopping-list/{id}
@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shopping_list(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    list_id: int
):
    shopping_list = await get_validated_shopping_list(db, current_user.id, list_id)
    
    await db.delete(shopping_list)
    await db.commit()
    
    return


# POST /shopping-list/{id}/checkout
@router.post("/{list_id}/checkout", status_code=status.HTTP_201_CREATED)
async def checkout_shopping_list(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    list_id: int,
    checkout_data: CheckoutRequest
):
    # 1. Get and validate the shopping list
    shopping_list = await get_validated_shopping_list(db, current_user.id, list_id)
    list_out = ShoppingListOut.model_validate_shopping_list(shopping_list)
    
    # 2. Determine transaction amount
    transaction_amount = checkout_data.actual_total_cost 
    if transaction_amount is None:
        transaction_amount = list_out.total_cost # Use estimated cost if actual not provided
        
    # 3. Create a Transaction object
    transaction_date = checkout_data.transaction_date or datetime.now()
    transaction_month = transaction_date.strftime("%Y-%m")
    
    transaction_in = TransactionCreate(
        amount=transaction_amount,
        date=transaction_date.date(), # Date only for Pydantic schema
        description=f"{checkout_data.transaction_description} ({shopping_list.name})",
        category_id=shopping_list.category_id,
        notes=f"Generated from shopping list: {shopping_list.name}"
    )
    
    new_transaction = Transaction(
        user_id=current_user.id,
        budget_month=transaction_month,
        **transaction_in.model_dump(exclude={'date'}),
        date=transaction_date, # Use full datetime for SQL model
    )
    
    # 4. Save Transaction, delete ShoppingList, update Budget
    
    # A. Add Transaction
    db.add(new_transaction)
    await db.flush() # Commit new transaction
    
    # B. Delete Shopping List
    await db.delete(shopping_list)
    
    # C. Update Category/Budget Actuals
    await update_category_actual(db, shopping_list.category_id)
    
    # 5. Commit all changes
    await db.commit()
    
    return {"message": f"Checkout complete. Transaction {new_transaction.id} created and list deleted."}