# backend/schemas/monthend.py

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- Nested Schemas ---
class CategorySummary(BaseModel):
    name: str
    type: str # Need | Want | Savings
    planned: float
    actual: float
    variance: float # Planned - Actual

class SurplusShortfallReport(BaseModel):
    total_income: float
    total_expenses: float
    total_planned: float
    total_actual: float
    
    # Net result BEFORE rollover/sweep
    overall_variance: float = Field(..., description="Income - Total Actual Expenses (Total Planned - Total Actual)")

    # Breakdown of overspent categories
    overspent_categories: List[CategorySummary]
    
    # Breakdown of underspent categories
    underspent_categories: List[CategorySummary]

class MonthlyReportOut(BaseModel):
    id: int
    user_id: int
    month: str
    total_income: float
    total_expenses: float
    total_saved: float
    net_surplus: float
    category_breakdown: List[CategorySummary]
    insights: List[Dict[str, Any]] # Placeholder for AI insights
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Wizard Step Schemas ---

class WizardStep1Out(SurplusShortfallReport):
    """Output for Step 1: Summary of month"""
    pass

class WizardStep3In(BaseModel):
    """Input for Step 3: Sweep positive differences"""
    # Amount to sweep to a goal, or amount to roll over to Free-to-Spend
    sweep_amount_to_goal: float = Field(..., ge=0)
    # The goal to receive the sweep (optional if rolling to Free-to-Spend)
    goal_id: Optional[int] = None 
    # Boolean flag to confirm the user has reviewed the summary
    confirmation: bool = Field(True)

class WizardStep4Out(MonthlyReportOut):
    """Output for Step 4: Final Report and New Budget creation"""
    new_budget_month: Optional[str] = Field(None, description="Month of the newly created budget document")
    new_free_to_spend: float = Field(..., description="The free_to_spend balance carried over")