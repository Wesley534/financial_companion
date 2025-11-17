# backend/models/user.py

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import List
from database import Base

# Note: In relational DBs, we often keep configurations in the same table,
# or a 1-to-1 relationship. For simplicity, we'll embed the settings columns
# directly into the User table for the MVP.

class User(Base):
    __tablename__ = "users"

    # Core Fields
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Settings Fields (embedded as per spec)
    auto_categorization: Mapped[bool] = mapped_column(Boolean, default=True)
    strict_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_insights: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships (will be added later)
    # budgets: Mapped[List["Budget"]] = relationship(back_populates="user")