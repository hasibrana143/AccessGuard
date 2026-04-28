#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting production server at $(date)"
  bun .next/standalone/server.js 2>&1
  echo "Server died at $(date). Restarting in 2 seconds..."
  sleep 2
done
