# backend/models/monthly_report.py

from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base 

# Avoid circular imports during runtime for type hints
if TYPE_CHECKING:
    from .user import User


# --- MonthlyReport Model ---
class MonthlyReport(Base):
    __tablename__ = "monthly_reports"

    # Core Fields
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    month: Mapped[str] = mapped_column(String(7), unique=True, index=True, nullable=False) # e.g., "2025-03"
    
    # Financial Summary
    total_income: Mapped[float] = mapped_column(Float, default=0.0)
    total_expenses: Mapped[float] = mapped_column(Float, default=0.0) # Total Actual (Needs + Wants)
    total_saved: Mapped[float] = mapped_column(Float, default=0.0) # Total Actual (Savings)
    net_surplus: Mapped[float] = mapped_column(Float, default=0.0) # Final calculated surplus
    
    # Details (Stored as JSON for flexible data structure)
    category_breakdown_json: Mapped[str] = mapped_column(Text, nullable=False, default='[]')
    insights_json: Mapped[str] = mapped_column(Text, nullable=False, default='[]')
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="monthly_reports")