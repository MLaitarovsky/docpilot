FROM python:3.12-slim

WORKDIR /app

# Install system deps needed by asyncpg, psycopg2, and PyMuPDF
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make the start script executable
RUN chmod +x start.sh

EXPOSE 8000

# Default: run migrations then start the API.
# Railway overrides this with: bash start.sh (which uses $PORT automatically).
# The worker service overrides this with the Celery command.
CMD ["bash", "start.sh"]
