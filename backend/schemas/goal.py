# backend/schemas/goal.py

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime, date

# --- Goal Schemas ---
class GoalBase(BaseModel):
    name: str = Field(..., max_length=100)
    target_amount: float = Field(..., ge=0)
    monthly_contribution: float = Field(0.0, ge=0)
    target_date: Optional[date] = None

class GoalCreate(GoalBase):
    # For a new goal, the starting amount is 0
    pass

class GoalUpdate(GoalBase):
    # All fields optional for update
    name: Optional[str] = None
    target_amount: Optional[float] = None
    monthly_contribution: Optional[float] = None
    target_date: Optional[date] = None
    # Allow manually adjusting saved amount (e.g., for initial import)
    saved_amount: Optional[float] = None 

class GoalOut(GoalBase):
    id: int
    user_id: int
    saved_amount: float
    created_at: datetime
    
    # Calculated field for frontend display
    progress_percent: float = Field(..., description="Percentage of saved amount vs target")

    class Config:
        from_attributes = True
    
    # Custom root validator to calculate progress_percent
    @classmethod
    def model_validate(cls, data: Any, **kwargs):
        instance = super().model_validate(data, **kwargs)
        if instance.target_amount > 0:
            instance.progress_percent = round(min(100.0, (instance.saved_amount / instance.target_amount) * 100), 2)
        else:
            instance.progress_percent = 0.0
        return instance

# --- Contribution Schemas ---
class ContributionRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount to contribute or sweep.")
    # Optional: Associate with a specific Savings category if needed for detailed tracking
    # category_id: Optional[int] = None 
    
    # For the "Sweep Surplus" feature, we might need a flag to track the source
    is_sweep: bool = Field(False, description="True if this contribution comes from an end-of-month surplus sweep.")