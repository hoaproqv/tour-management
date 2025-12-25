#!/bin/sh
set -e

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

if [ -n "$DB_HOST" ]; then
  echo "Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; do
    sleep 1
  done
fi

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static assets..."
python manage.py collectstatic --noinput

HOST=${SERVER_HOST:-0.0.0.0}
PORT=${SERVER_PORT:-8000}

if [ "${DJANGO_DEBUG}" = "True" ] || [ "${DJANGO_DEBUG}" = "true" ]; then
  echo "Starting Django dev server on ${HOST}:${PORT}..."
  exec python manage.py runserver ${HOST}:${PORT}
else
  echo "Starting Gunicorn on ${HOST}:${PORT}..."
  GUNICORN_TIMEOUT=${GUNICORN_TIMEOUT:-60}
  GUNICORN_WORKERS=${GUNICORN_WORKERS:-2}
  exec gunicorn tour_management.wsgi:application \
    --bind ${HOST}:${PORT} \
    --workers "$GUNICORN_WORKERS" \
    --timeout "$GUNICORN_TIMEOUT"
fi
