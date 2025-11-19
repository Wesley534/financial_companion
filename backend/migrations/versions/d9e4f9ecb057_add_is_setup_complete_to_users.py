"""add is_setup_complete to users

Revision ID: d9e4f9ecb057
Revises: 11fff5bd7ed2
Create Date: 2025-11-19 11:36:31.150771
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd9e4f9ecb057'
down_revision = '0257851f2371'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add the is_setup_complete column to users."""
    op.add_column(
        'users',
        sa.Column('is_setup_complete', sa.Boolean(), nullable=False, server_default=sa.false())
    )


def downgrade() -> None:
    """Remove the is_setup_complete column from users."""
    op.drop_column('users', 'is_setup_complete')
