#!/usr/bin/env bash
# Run import:pickleball-effect until it completes (exit 0). Idempotent; safe to retry.
set -e
MAX_ATTEMPTS=10
ATTEMPT=1
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "=== Attempt $ATTEMPT of $MAX_ATTEMPTS ==="
  if pnpm run import:pickleball-effect; then
    echo "Import completed successfully."
    exit 0
  fi
  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -le $MAX_ATTEMPTS ]; then
    echo "Connection may have dropped. Retrying in 15s..."
    sleep 15
  fi
done
echo "Import did not complete after $MAX_ATTEMPTS attempts."
exit 1
