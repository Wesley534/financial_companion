"""initial migration

Revision ID: 0257851f2371
Revises: 
Create Date: 2025-11-19 10:26:51.905020

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0257851f2371'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(100), unique=True, nullable=False),
        sa.Column('password_hash', sa.String, nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, server_default='USD'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        sa.Column('auto_categorization', sa.Boolean, nullable=False, server_default=sa.text('TRUE')),
        sa.Column('strict_mode', sa.Boolean, nullable=False, server_default=sa.text('FALSE')),
        sa.Column('ai_insights', sa.Boolean, nullable=False, server_default=sa.text('TRUE')),
    )

    # Create budgets table
    op.create_table(
        'budgets',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('month', sa.String(7), nullable=False, index=True),
        sa.Column('income', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('starting_balance', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('free_to_spend', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('totals_json', sa.Text, nullable=False, server_default='{"planned":0.0,"actual":0.0,"difference":0.0}'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
    )

    # Create categories table
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('budget_month', sa.String(7), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('type', sa.String(10), nullable=False, server_default='Need'),
        sa.Column('planned', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('actual', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('icon', sa.String(50), nullable=False, server_default='dollar-sign'),
        sa.Column('color', sa.String(7), nullable=False, server_default='#333333'),
    )


def downgrade() -> None:
    op.drop_table('categories')
    op.drop_table('budgets')
    op.drop_table('users')
