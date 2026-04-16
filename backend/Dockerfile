FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copy project
COPY . .

# Copy and set permissions for entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Collect static files
RUN python manage.py collectstatic --noinput

# Create directories and set permissions
RUN mkdir -p /app/media/galleries/{covers,images,private,public/{bestof,bw,explore,streets}} \
    /app/media/thumbnails \
    /app/logs && \
    chmod -R 777 /app/media && \
    chown -R nobody:nogroup /app/logs

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /app/logs && \
    chmod -R 755 /app

USER appuser

# Expose port
EXPOSE 8000

# Use entrypoint script to run migrations before starting server
ENTRYPOINT ["/app/entrypoint.sh"]

