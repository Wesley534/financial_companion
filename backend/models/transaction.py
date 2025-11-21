# backend/models/transaction.py

from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base 

# Avoid circular imports during runtime for type hints
if TYPE_CHECKING:
    from .user import User
    from .budget import Category 


# --- Transaction Model ---
class Transaction(Base):
    __tablename__ = "transactions"

    # Core Fields
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    budget_month: Mapped[str] = mapped_column(String(7), nullable=False) # e.g., "2025-03"
    
    # Financial Details
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False) # Positive or negative value
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # AI/System Fields
    ai_category_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Recurring Field
    recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="transactions") # Add to User model later
    category: Mapped["Category"] = relationship(back_populates="transactions") # Add back_populates to Category model later