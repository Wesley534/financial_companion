# backend/database.py

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from config import settings

# --- Engine & Session Setup ---
# The create_async_engine function is crucial for modern SQLAlchemy
engine = create_async_engine(settings.DATABASE_URL)

# Define a session maker to create sessions later
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# --- Base Class for Models ---
class Base(DeclarativeBase):
    """Base class which provides automated table name
    a base method for getting the ID as a string, etc."""
    pass

# Dependency for getting a database session
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session