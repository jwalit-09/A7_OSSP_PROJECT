FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    procps \
    coreutils \
    findutils \
    grep \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Create the workspace directory
RUN mkdir -p /tmp/shellforge_workspace

# Expose port
EXPOSE 5000

# Run with eventlet for WebSocket support
CMD ["python", "app.py"]
