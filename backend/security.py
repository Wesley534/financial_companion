# /home/wes/Desktop/projects/financial_companion/backend/security.py

from datetime import datetime, timedelta, timezone
from typing import Annotated
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# SQLAlchemy Imports for Dependency
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Absolute Imports
from config import settings
from models.user import User
from database import get_db

# --- Password Hashing with Argon2 ---
# Change the scheme from "bcrypt" to "argon2"
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Argon2 does not have the 72-byte limit, so we simplify the functions
def get_password_hash(password: str) -> str:
    """Hashes the plain password using Argon2."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies the plain password against the stored hash."""
    # NOTE: Argon2 is typically robust enough that it handles long passwords
    # without needing manual truncation.
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # Handle case where hash might be malformed or incompatible (optional)
        return False


# --- JWT Token Generation & Verification ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt

# --- Dependency to get the current authenticated user ---
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the JWT token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_email: str = payload.get("sub")
        if user_email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Use SQLAlchemy query to find the user
    stmt = select(User).where(User.email == user_email)
    user = (await db.execute(stmt)).scalars().first()

    if user is None:
        raise credentials_exception
    return user