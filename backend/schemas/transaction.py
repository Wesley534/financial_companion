from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict
from datetime import datetime, date as date_type

# --- Nested Schema for Output (e.g., in lists) ---
class TransactionCategoryOut(BaseModel):
    id: int
    name: str
    color: str
    icon: str

    # Using model_config for Pydantic V2 style (though Config also works)
    model_config = ConfigDict(from_attributes=True)
    # class Config: # Legacy Pydantic V1 style
    #     from_attributes = True


# --- Transaction Base Schemas ---
class TransactionBase(BaseModel):
    amount: float = Field(..., description="The transaction amount (positive or negative).")
    date: date_type = Field(..., description="Date of the transaction.")
    description: str = Field(..., max_length=255)
    category_id: int = Field(..., description="ID of the associated budget category.")
    notes: Optional[str] = Field(None, max_length=255)
    
# --- Request Schemas ---
class TransactionCreate(TransactionBase):
    # Category_id is required for a new transaction
    pass

class TransactionUpdate(TransactionBase):
    # All fields optional for PATCH
    amount: Optional[float] = None
    date: Optional[date_type] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    notes: Optional[str] = None
    recurring: Optional[bool] = None

# --- Response Schemas ---
class TransactionOut(TransactionBase):
    id: int
    user_id: int
    budget_month: str
    ai_category_confidence: float
    recurring: bool
    created_at: datetime
    
    # Optional nested object for the category details (for display)
    category: Optional[TransactionCategoryOut] = None

    model_config = ConfigDict(from_attributes=True)

# --- Filtering/Query Schemas ---
class TransactionFilter(BaseModel):
    category_id: Optional[int] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    start_date: Optional[date_type] = None
    end_date: Optional[date_type] = None
    recurring: Optional[bool] = None
    month: Optional[str] = None # YYYY-MM