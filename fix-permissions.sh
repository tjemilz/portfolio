#!/bin/bash
# Script to fix media folder permissions for Docker

echo "🔧 Fixing media folder permissions..."

# Create media directories if they don't exist
mkdir -p ./backend/media/galleries/{covers,images,private,public/{bestof,bw,explore,streets}}
mkdir -p ./backend/media/thumbnails

# Fix ownership - make sure the directories are writable by the container
# Docker containers typically run with a specific UID/GID
# We'll make them world-writable as a safe approach for development/small deployments
chmod -R 777 ./backend/media
chmod -R 777 ./backend/media/galleries
chmod -R 777 ./backend/media/thumbnails

# Alternative: If you want stricter permissions for production
# You would need to match the UID/GID of the user running Django in the container
# Typically that's UID 1000 (standard user) or root (UID 0)

echo "✅ Permissions fixed!"
echo ""
echo "Backend media directory structure:"
ls -la ./backend/media/
