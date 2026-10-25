FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    git build-essential libpq-dev tesseract-ocr chromium chromium-driver \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
 && python -m spacy download en_core_web_sm
COPY . .
EXPOSE 8080
