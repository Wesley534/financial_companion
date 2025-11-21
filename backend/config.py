# backend/config.py (FIXED)

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    # Database (Postgres)
    # Example format: postgresql+asyncpg://user:password@host:port/dbname
    DATABASE_URL: str = Field(..., env='DATABASE_URL') 

    # Security
    SECRET_KEY: str = Field(..., env='SECRET_KEY')
    ALGORITHM: str = Field(..., env='ALGORITHM')
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(..., env='ACCESS_TOKEN_EXPIRE_MINUTES')

    # Frontend/Vite Configuration - <--- ADDED THIS FIELD
    VITE_API_URL: str = Field(..., env='VITE_API_URL') 

    # AI (Remain the same)
    HUGGING_FACE_API_KEY: str = Field(..., env='HUGGING_FACE_API_KEY')
    HF_CATEGORIZATION_MODEL: str = Field(..., env='HF_CATEGORIZATION_MODEL')
    HF_INSIGHTS_MODEL: str = Field(..., env='HF_INSIGHTS_MODEL')

    class Config:
        env_file = '../.env'
        env_file_encoding = 'utf-8'

settings = Settings()