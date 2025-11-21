#!/usr/bin/env bash

# Exit immediately if a command fails
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting Gunicorn server..."
gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT:-8000}
