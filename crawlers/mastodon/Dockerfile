FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the crawler code
COPY . .

# Create directory for Mastodon secrets
RUN mkdir -p /app/secrets

# Command to run the crawler
CMD ["python", "main.py"] 