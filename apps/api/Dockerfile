FROM python:3.12-slim

WORKDIR /app

# Install system deps needed by asyncpg, psycopg2, and PyMuPDF
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Default command — overridden in docker-compose for the worker service
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
