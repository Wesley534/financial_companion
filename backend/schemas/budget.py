# backend/schemas/budget.py

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str = Field(..., description="Name of the category, e.g., 'Groceries'")
    type: str = Field(..., description="Type: 'Need', 'Want', or 'Savings'")
    planned: float = Field(..., ge=0, description="Planned budget amount")
    icon: str = Field("dollar-sign", description="Icon for display")
    color: str = Field("#333333", description="Hex color for display")

class CategoryCreate(CategoryBase):
    pass # Already set up for initial setup

class CategoryUpdate(CategoryBase):
    # All fields are optional for update
    name: Optional[str] = None
    type: Optional[str] = None
    planned: Optional[float] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryOut(CategoryBase):
    id: int
    actual: float = Field(0.0) # Will be calculated by a service layer/view
    budget_month: str
    user_id: int

    class Config:
        from_attributes = True

# --- Budget Schemas ---
class BudgetInitialSetup(BaseModel):
    """Schema for the first-time setup wizard data (Already exists)"""
    income: float = Field(..., ge=0)
    starting_balance: float = Field(..., ge=0)
    savings_goal_amount: float = Field(..., ge=0)
    allocation_method: str = Field("50/30/20", description="Method used for initial allocation: '50/30/20' or 'Manual'")
    initial_categories: Optional[List[CategoryCreate]] = None

class BudgetUpdate(BaseModel):
    """Schema for updating the main budget amounts after setup"""
    income: Optional[float] = Field(None, ge=0)
    starting_balance: Optional[float] = Field(None, ge=0)
    # Note: free_to_spend is typically calculated, not set directly

class BudgetOut(BaseModel):
    id: int
    month: str
    income: float
    starting_balance: float
    free_to_spend: float
    # We will use Python's json.loads on totals_json in the service layer
    totals: Dict[str, float] = Field(..., description="Parsed totals (planned, actual, difference)")
    
    class Config:
        from_attributes = True

# --- Combined Response Schema ---
class MonthlyBudgetOut(BudgetOut):
    """Complete response for the Monthly Budget Page"""
    categories: List[CategoryOut]
    # monthly_report: MonthlyReportOut # To be added later

    class Config:
        from_attributes = True