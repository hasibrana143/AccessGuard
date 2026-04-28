#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js server..."
  HOSTNAME="0.0.0.0" node node_modules/.bin/next dev -p 3000
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE"
  sleep 2
done
