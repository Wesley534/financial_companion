# backend/schemas/ai.py

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# --- Categorization Schemas ---
class CategorizeRequest(BaseModel):
    description: str = Field(..., description="The transaction description and amount, e.g., 'Starbucks $5.50'")
    # Context categories needed for zero-shot classification (IDs and names)
    context_categories: Dict[int, str] = Field(..., description="Map of existing Category ID to Category Name, e.g., {5: 'Groceries', 8: 'Dining Out'}")

class CategorizeResponse(BaseModel):
    predicted_category_id: int = Field(..., description="The ID of the category with the highest confidence.")
    confidence: float = Field(..., ge=0, le=1)
    
    # Raw output for debugging/display
    raw_predictions: List[Dict[str, Any]]

# --- Insights Schemas ---
class InsightsRequest(BaseModel):
    # Summary of the user's spending for the month to feed to the LLM
    spending_summary_text: str = Field(..., description="A summary of the user's budget and spending trends.")
    
    # Contextual data
    goals: List[Dict[str, Any]] = Field(..., description="List of goals and current progress.")
    strict_mode: bool = Field(False)

class InsightsResponse(BaseModel):
    insights: List[Dict[str, str]] = Field(..., description="A list of generated insights/alerts.")

# --- Predict Budget Status Schemas ---
class PredictStatusRequest(BaseModel):
    month_progress_percent: float = Field(..., ge=0, le=100)
    current_variance_percent: float = Field(..., description="Current (Actual/Planned) spending percentage.")
    
class PredictStatusResponse(BaseModel):
    projection: str = Field(..., description="Projection of budget status (e.g., 'On track to underspend by $50').")
    risk_level: str = Field(..., description="High, Medium, or Low.")