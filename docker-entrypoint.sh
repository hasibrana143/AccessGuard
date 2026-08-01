#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy 2>&1 || {
  code=$?
  echo "ERROR: Migration failed with exit code $code."
  echo "If you need to apply schema changes without a migration file, run:"
  echo "  npx prisma db push"
  echo "WARNING: db push may result in data loss. Only use this if you understand the risks."
  exit $code
}

echo "Starting application..."
exec "$@"
