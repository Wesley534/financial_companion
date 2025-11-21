# backend/models/shopping.py

from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column

from database import Base 

# Avoid circular imports during runtime for type hints
if TYPE_CHECKING:
    from .user import User
    from .budget import Category 


# --- ShoppingList Model ---
class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    # Core Fields
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    
    # List Details
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # The budget category this list's total cost affects
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False) 
    
    # Items (Stored as JSON string)
    # The JSON string will contain a list of objects: 
    # [{name: str, estimated_price: float, quantity: int}, ...]
    items_json: Mapped[str] = mapped_column(Text, nullable=False, default='[]')
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="shopping_lists") # To be added to User model
    category: Mapped["Category"] = relationship() # One-way relationship to Category