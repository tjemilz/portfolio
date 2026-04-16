#!/bin/bash

# Exit on error
set -e

echo "Waiting for database to be ready..."
sleep 2

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "Creating default galleries if needed..."
python manage.py create_default_galleries || true

echo "Starting Gunicorn server..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 --threads 2 portfolio_api.wsgi:application
