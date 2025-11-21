# backend/schemas/shopping.py

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import json
from datetime import datetime

# --- Nested Item Schema ---
class ShoppingListItem(BaseModel):
    name: str = Field(..., description="Name of the item, e.g., 'Milk'")
    estimated_price: float = Field(..., ge=0)
    quantity: int = Field(1, ge=1)
    
    @property
    def total_price(self) -> float:
        return self.estimated_price * self.quantity

# --- Shopping List Base Schemas ---
class ShoppingListBase(BaseModel):
    name: str = Field(..., max_length=100)
    category_id: int = Field(..., description="ID of the category this list affects")

class ShoppingListCreate(ShoppingListBase):
    items: List[ShoppingListItem] = Field(..., description="List of items in the shopping list")

class ShoppingListUpdate(ShoppingListBase):
    name: Optional[str] = None
    category_id: Optional[int] = None
    items: Optional[List[ShoppingListItem]] = None

# --- Response Schemas ---
class ShoppingListOut(ShoppingListBase):
    id: int
    user_id: int
    created_at: datetime
    
    # The items parsed from items_json
    items: List[ShoppingListItem] 
    
    # Calculated fields (not stored in DB, but included in response)
    total_cost: float = Field(..., description="Calculated total cost of all items in the list")
    # budget_status (Green/Yellow/Red) can be calculated on the frontend
    
    class Config:
        from_attributes = True

    @classmethod
    def model_validate_shopping_list(cls, shopping_list_obj: Any) -> 'ShoppingListOut':
        """Custom validation to parse items_json and calculate total_cost."""
        
        # 1. Parse items_json
        items_data = json.loads(shopping_list_obj.items_json)
        items = [ShoppingListItem.model_validate(item) for item in items_data]
        
        # 2. Calculate total cost
        total_cost = sum(item.total_price for item in items)
        
        # 3. Create the output dict
        output_data = shopping_list_obj.__dict__
        output_data['items'] = items
        output_data['total_cost'] = total_cost
        
        # 4. Use the parent class's validation
        return cls.model_validate(output_data)

# --- Checkout Schemas ---
class CheckoutRequest(BaseModel):
    # If the user wants to use the original estimated price or enter an actual total
    actual_total_cost: Optional[float] = Field(None, ge=0) 
    transaction_date: Optional[datetime] = None
    transaction_description: str = Field("Shopping List Purchase", description="Description for the resulting transaction")