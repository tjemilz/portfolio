#!/bin/bash

# Exit on error
set -e

if [ -d "/app/db.sqlite3" ]; then
    echo "❌ ERREUR: /app/db.sqlite3 est un dossier et non un fichier !"
    echo "Docker a créé un dossier sur l'hôte car le fichier n'existait pas lors du montage."
    echo "Sur votre hôte, exécutez :"
    echo "  rm -rf backend/db.sqlite3 && touch backend/db.sqlite3 && chmod 666 backend/db.sqlite3"
    exit 1
fi

echo "Waiting for database to be ready..."
sleep 2

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "Creating default galleries if needed..."
python manage.py create_default_galleries || true

echo "Starting Gunicorn server..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 --threads 2 core.wsgi:application
