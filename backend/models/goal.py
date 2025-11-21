# backend/models/goal.py

from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base 

# Avoid circular imports during runtime for type hints
if TYPE_CHECKING:
    from .user import User


# --- Goal Model ---
class Goal(Base):
    __tablename__ = "goals"

    # Core Fields
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    
    # Goal Details
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    target_amount: Mapped[float] = mapped_column(Float, default=0.0)
    saved_amount: Mapped[float] = mapped_column(Float, default=0.0) # Current amount saved
    monthly_contribution: Mapped[float] = mapped_column(Float, default=0.0) # Suggested contribution (set by user/setup)
    
    # Optional Fields
    target_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True) # Optional completion date
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="goals") # To be added to User model
    # Note: Contribution history can be derived from Transactions tagged to a special Savings category