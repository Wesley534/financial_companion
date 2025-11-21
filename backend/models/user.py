# backend/models/user.py (UPDATED with all relationships)

from datetime import datetime
from typing import List, TYPE_CHECKING
from sqlalchemy import Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from database import Base 

# Avoid circular imports during runtime for type hints
if TYPE_CHECKING:
    # Import all models the User has a relationship with
    from .budget import Budget, Category
    from .transaction import Transaction
    from .shopping import ShoppingList
    from .goal import Goal
    from .monthly_report import MonthlyReport 


class User(Base):
    __tablename__ = "users"

    # Core Fields (from Auth module)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # --- SETUP & SETTINGS ---
    is_setup_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_categorization: Mapped[bool] = mapped_column(Boolean, default=True)
    strict_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_insights: Mapped[bool] = mapped_column(Boolean, default=True)

    # --- RELATIONSHIPS (The Update) ---
    budgets: Mapped[List["Budget"]] = relationship(back_populates="user")
    categories: Mapped[List["Category"]] = relationship(back_populates="user")
    transactions: Mapped[List["Transaction"]] = relationship(back_populates="user") # <-- ADDED
    shopping_lists: Mapped[List["ShoppingList"]] = relationship(back_populates="user") # <-- ADDED
    goals: Mapped[List["Goal"]] = relationship(back_populates="user") # <-- ADDED
    monthly_reports: Mapped[List["MonthlyReport"]] = relationship(back_populates="user") # <-- ADDED for Month End
    ai_logs: Mapped[List["InsightsAI"]] = relationship(back_populates="user") # <-- ADDED ai_logs
