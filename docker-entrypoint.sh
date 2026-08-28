#!/bin/sh
set -e
cd /app

echo "waiting for postgres..."
i=0
until node -e "const u=process.env.DATABASE_URL; if(!u) process.exit(1)" 2>/dev/null; do
  i=$((i+1)); if [ "$i" -gt 30 ]; then echo "DATABASE_URL missing"; exit 1; fi
  sleep 1
done

npm run migrate -w @matriz/db
npm run seed -w @matriz/db

if [ "${PROCESS_ROLE}" = "worker" ]; then
  exec npm run start -w @matriz/worker
fi

exec npm run start -w @matriz/web
