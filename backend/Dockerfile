
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
# Use mirror for speed in China if needed, but standard is fine
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Run the application
# We assume the docker context is ./backend, so app is at /app/app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
