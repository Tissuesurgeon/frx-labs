# FRX Shield AI Engine — Python (FastAPI + ChromaDB client)
# Build: docker build -f apps/ai-engine/Dockerfile -t frx-ai .
# Run:   docker run -p 8001:8001 --env-file .env frx-ai

FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

COPY apps/ai-engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/ai-engine/app ./app

ENV PYTHONUNBUFFERED=1 \
    PORT=8001

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -sf "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
