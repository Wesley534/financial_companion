# backend/migrations/env.py

import asyncio
from logging.config import fileConfig
import os
import sys

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

# Add project root to sys.path so imports work
sys.path.insert(0, os.path.abspath(".."))

# Import settings and models
from backend.config import settings
from backend.database import Base
from backend.models.user import User
from backend.models.budget import Budget, Category

# Alembic Config object
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Link metadata for 'autogenerate'
target_metadata = Base.metadata


# ----------------------------
# Offline Migrations (SQL only)
# ----------------------------
def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# ----------------------------
# Helper for online async migration
# ----------------------------
def do_run_migrations(connection: Connection):
    """Run migrations in online mode using a given connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )
    with context.begin_transaction():
        context.run_migrations()


# ----------------------------
# Online Migrations (async)
# ----------------------------
async def run_async_migrations():
    """Run migrations in 'online' mode using async engine."""
    connectable = create_async_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
        future=True,
    )

    async with connectable.connect() as connection:
        # Wrap the synchronous migration function
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online():
    """Entrypoint for online migrations."""
    asyncio.run(run_async_migrations())


# ----------------------------
# Run appropriate migration mode
# ----------------------------
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
