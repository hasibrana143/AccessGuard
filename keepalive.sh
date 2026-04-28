#!/bin/bash
while true; do
  if ! ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "$(date): Starting server..." >> /home/z/my-project/keepalive.log
    cd /home/z/my-project && node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
    sleep 5
  fi
  sleep 10
done
