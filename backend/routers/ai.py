# backend/routers/ai.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, Dict
from datetime import datetime
import json
import random

# Absolute Imports
from database import get_db
from models.user import User
from models.ai import InsightsAI
from schemas.ai import (
    CategorizeRequest, 
    CategorizeResponse, 
    InsightsRequest, 
    InsightsResponse,
    PredictStatusRequest,
    PredictStatusResponse
)
from security import get_current_user 
from models.budget import Category # Needed for prediction logging

router = APIRouter()

# --- External AI Integration (SIMULATED) ---
# NOTE: In a production app, this logic would live in a dedicated Python service 
# module that uses the 'requests' or 'httpx' library to call the Hugging Face API.
# Example: from services.ai_service import categorize_transaction

async def simulate_categorization(description: str, context: Dict[int, str]) -> CategorizeResponse:
    """Simulates a call to a zero-shot categorization model."""
    
    # Simple Mock Logic:
    # 1. Look for keywords to assign a plausible category ID.
    category_map = {
        "starbucks": 8, "kfc": 8, "restaurant": 8, "dining out": 8, # Dining Out
        "walmart": 5, "grocer": 5, "market": 5, "whole foods": 5, # Groceries
        "rent": 1, "mortgage": 1, "housing": 1, # Housing
        "netflix": 4, "spotify": 4, "entertainment": 4 # Entertainment (Assuming IDs are 1, 4, 5, 8)
    }
    
    # Default to the first category if none match
    default_id = next(iter(context.keys()), -1)
    
    predicted_id = default_id
    
    for keyword, cat_id in category_map.items():
        if keyword in description.lower():
            if cat_id in context:
                predicted_id = cat_id
            break
            
    # Simulate high confidence
    confidence = random.uniform(0.75, 0.99)
    
    # Generate mock raw predictions
    mock_raw = [{"label": context[k], "score": round(random.uniform(0.01, 0.99), 4)} for k in context]
    
    return CategorizeResponse(
        predicted_category_id=predicted_id,
        confidence=confidence,
        raw_predictions=mock_raw
    )
    
# --- Endpoints ---

# POST /ai/categorize
@router.post("/categorize", response_model=CategorizeResponse)
async def categorize_transaction_ai(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    categorize_request: CategorizeRequest
):
    if not current_user.auto_categorization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="AI categorization is disabled in user settings.")
        
    # 1. Call the simulated AI service
    ai_response = await simulate_categorization(
        categorize_request.description, 
        categorize_request.context_categories
    )
    
    # 2. Log the AI interaction (for future model training/auditing)
    ai_log = InsightsAI(
        user_id=current_user.id,
        input_text=categorize_request.description,
        ai_endpoint="categorize",
        ai_output_json=ai_response.model_dump_json(exclude_none=True),
        category_prediction_id=ai_response.predicted_category_id,
        confidence=ai_response.confidence
    )
    db.add(ai_log)
    await db.commit()
    
    return ai_response


# POST /ai/insights
@router.post("/insights", response_model=InsightsResponse)
async def generate_insights(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    insights_request: InsightsRequest
):
    if not current_user.ai_insights:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="AI insights are disabled in user settings.")
        
    # Simulate LLM response generation based on the input text
    # In a real app, this would be a prompt engineering task
    
    # Mocking a few scenarios based on keywords
    mock_insights = []
    
    if "overspent" in insights_request.spending_summary_text.lower():
        mock_insights.append({"type": "alert", "text": "Immediate action required! You are 15% over budget in your 'Wants' category. Consider reducing dining out for the rest of the month."})
    
    if "savings goal" in insights_request.spending_summary_text.lower() and "75%" in insights_request.spending_summary_text.lower():
        mock_insights.append({"type": "projection", "text": "Fantastic! You are on track to hit your main savings goal 2 months ahead of schedule. Keep the momentum going!"})

    if not mock_insights:
        mock_insights.append({"type": "tip", "text": "Your budget is perfectly balanced. Try turning on 'Strict Mode' in settings to lock categories once fully spent."})

    # Log the interaction
    ai_log = InsightsAI(
        user_id=current_user.id,
        input_text=insights_request.spending_summary_text,
        ai_endpoint="insights",
        ai_output_json=json.dumps(mock_insights),
        confidence=1.0 # System generated confidence
    )
    db.add(ai_log)
    await db.commit()
    
    return InsightsResponse(insights=mock_insights)


# POST /ai/predict-budget-status
@router.post("/predict-budget-status", response_model=PredictStatusResponse)
async def predict_budget_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    predict_request: PredictStatusRequest
):
    # This feature usually uses a simple regression model or heuristic, not a complex LLM
    
    month_progress = predict_request.month_progress_percent
    variance = predict_request.current_variance_percent # Actual / Planned (e.g., 80/100 = 0.8)

    risk_level = "Low"
    projection = "On track to complete the month with a balanced budget."
    
    if variance > 1.05 and month_progress < 50:
        risk_level = "High"
        projection = "Critical alert: Spending is significantly ahead of the curve. Projecting to be over budget by 20-30%."
    elif variance > 1.0 and month_progress > 75:
        risk_level = "Medium"
        projection = "Slightly over budget. Projecting to exceed budget by less than 10% by month-end."
    elif variance < 0.8 and month_progress > 50:
        projection = "Excellent! Spending below trend. Projecting an underspend of at least 15%."
        
    return PredictStatusResponse(
        projection=projection,
        risk_level=risk_level
    )