# Backend Dockerfile for production
FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY api/ .

# Create storage directory
RUN mkdir -p storage

# Expose port
EXPOSE 8000

# Use gunicorn for production
CMD gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app --bind 0.0.0.0:$PORT
