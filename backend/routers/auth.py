from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from typing import Annotated

# Absolute Imports
from database import get_db 
from models.user import User
from security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
)

router = APIRouter()

# --- Schemas (Pydantic Models for Request/Response) ---

# NEW: Schema for Login Request (Only requires email and password)
class UserLogin(BaseModel):
    email: str
    password: str

# Existing: Schema for Register Request (Requires name, email, password)
class UserIn(BaseModel):
    name: str
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    is_setup_complete: bool  # <--- ADD THIS FIELD
    currency: str | None = None  # Optional, if you want to include

    class Config:
        from_attributes = True


    class Config:
        from_attributes = True

# --- Endpoints ---

# POST /auth/register
@router.post("/register", response_model=UserOut)
async def register_user(user_in: UserIn, db: Annotated[AsyncSession, Depends(get_db)]):
    # Check if user already exists
    stmt = select(User).where(User.email == user_in.email)
    existing_user = (await db.execute(stmt)).scalars().first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Hash password and create user object
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_password,
    )

    # Add to session and commit to DB
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user) # Get the generated ID

    return new_user


# POST /auth/login (UPDATED to use UserLogin)
@router.post("/login", response_model=Token)
async def login_for_access_token(user_in: UserLogin, db: Annotated[AsyncSession, Depends(get_db)]):
    stmt = select(User).where(User.email == user_in.email)
    user = (await db.execute(stmt)).scalars().first()

    if user is None or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.email}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# GET /auth/me
@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user)):
    # The current_user is already fetched and authenticated by the dependency
    return current_user