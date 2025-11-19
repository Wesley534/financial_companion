# backend/schemas/budget.py

from pydantic import BaseModel, Field
from typing import List, Optional

# --- Category Schemas ---
class CategoryCreate(BaseModel):
    name: str = Field(..., description="Name of the category, e.g., 'Groceries'")
    type: str = Field(..., description="Type: 'Need', 'Want', or 'Savings'")
    planned: float = Field(..., ge=0, description="Planned budget amount")
    icon: str = Field("dollar-sign", description="Icon for display")
    color: str = Field("#333333", description="Hex color for display")

class CategoryOut(CategoryCreate):
    id: int
    actual: float = Field(0.0)
    budget_month: str
    user_id: int

    class Config:
        from_attributes = True

# --- Budget Schemas ---
class BudgetInitialSetup(BaseModel):
    """Schema for the first-time setup wizard data"""
    income: float = Field(..., ge=0)
    starting_balance: float = Field(..., ge=0)
    savings_goal_amount: float = Field(..., ge=0)
    allocation_method: str = Field("50/30/20", description="Method used for initial allocation: '50/30/20' or 'Manual'")
    
    # If allocation_method is Manual, we accept initial categories
    initial_categories: Optional[List[CategoryCreate]] = None

class BudgetOut(BaseModel):
    id: int
    month: str
    income: float
    starting_balance: float
    free_to_spend: float

    class Config:
        from_attributes = True