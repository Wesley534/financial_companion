# backend/models/ai.py

from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base 

# Avoid circular imports during runtime for type hints
if TYPE_CHECKING:
    from .user import User


# --- InsightsAI Model (For logging/training history) ---
class InsightsAI(Base):
    __tablename__ = "insights_ai"

    # Core Fields
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    
    # Interaction Details
    input_text: Mapped[str] = mapped_column(Text, nullable=False) # User input (e.g., "KFC $25")
    ai_endpoint: Mapped[str] = mapped_column(String(50), nullable=False) # e.g., "categorize", "insights"
    
    # AI Output
    ai_output_json: Mapped[str] = mapped_column(Text, nullable=False) # Full JSON response from HF API
    category_prediction_id: Mapped[int | None] = mapped_column(Integer, nullable=True) # ID of the predicted category
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="ai_logs") # To be added to User model