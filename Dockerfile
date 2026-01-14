# syntax=docker/dockerfile:1

FROM node:20-bullseye-slim AS frontend
WORKDIR /app/react
COPY react/package*.json ./
RUN npm install
COPY react/ ./
RUN npm run build

FROM python:3.12-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y build-essential libpq-dev postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./
COPY --from=frontend /app/react/builded /app/react/builded
# Normalize line endings and stage entrypoint outside the bind mount path
RUN sed -i 's/\r$//' docker/entrypoint.sh \
    && cp docker/entrypoint.sh /entrypoint.sh \
    && chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
