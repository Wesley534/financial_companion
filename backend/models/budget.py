# backend/models/budget.py

from datetime import datetime
from typing import List, TYPE_CHECKING
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base 

# Avoid circular imports during runtime for type hints
if TYPE_CHECKING:
    from .user import User
    from .transaction import Transaction # <-- Ensure this import is available


# --- Category Model ---
class Category(Base):
    __tablename__ = "categories"

    # Core Fields
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    budget_month: Mapped[str] = mapped_column(String(7), nullable=False) # e.g., "2025-03"
    
    # Budget Details
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[str] = mapped_column(String(10), default="Need") # Need | Want | Savings
    planned: Mapped[float] = mapped_column(Float, default=0.0)
    actual: Mapped[float] = mapped_column(Float, default=0.0)
    icon: Mapped[str] = mapped_column(String(50), default="dollar-sign")
    color: Mapped[str] = mapped_column(String(7), default="#333333")
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="categories")
    # New: Add relationship to transactions for this category
    transactions: Mapped[List["Transaction"]] = relationship(back_populates="category") # <-- ADDED REAL RELATIONSHIP


# --- Budget Model ---
class Budget(Base):
    __tablename__ = "budgets"

    # Core Fields
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    # Combined unique constraint on user_id and month will be added in Alembic
    month: Mapped[str] = mapped_column(String(7), index=True, nullable=False) # "2025-03"
    
    # Budget Details
    income: Mapped[float] = mapped_column(Float, default=0.0)
    starting_balance: Mapped[float] = mapped_column(Float, default=0.0)
    free_to_spend: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Calculated Totals (Stored as Text/JSON in a relational DB)
    totals_json: Mapped[str] = mapped_column(Text, nullable=False, default='{"planned": 0.0, "actual": 0.0, "difference": 0.0}')

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="budgets")