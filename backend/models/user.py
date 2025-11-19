# backend/models/user.py

from datetime import datetime
from typing import List
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from database import Base # Assumes Base is imported correctly

# We need forward references for Budget and Category models
# from .budget import Budget, Category # Imported within quotes below

class User(Base):
    __tablename__ = "users"

    # Core Fields (from Auth module)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # --- NEW FIELD FOR SETUP STATUS ---
    is_setup_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    # ----------------------------------

    # Settings Fields
    auto_categorization: Mapped[bool] = mapped_column(Boolean, default=True)
    strict_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_insights: Mapped[bool] = mapped_column(Boolean, default=True)

    # --- ADD RELATIONSHIPS ---
    budgets: Mapped[List["Budget"]] = relationship(back_populates="user")
    categories: Mapped[List["Category"]] = relationship(back_populates="user")
    # -------------------------
    # NOTE: You will need to add relationships for Transactions, ShoppingLists, Goals later.