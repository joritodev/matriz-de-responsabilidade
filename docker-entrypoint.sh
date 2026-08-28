#!/bin/sh
set -e
cd /app

echo "waiting for postgres..."
i=0
until node -e "const u=process.env.DATABASE_URL; if(!u) process.exit(1)" 2>/dev/null; do
  i=$((i+1)); if [ "$i" -gt 30 ]; then echo "DATABASE_URL missing"; exit 1; fi
  sleep 1
done

pnpm --filter @matriz/db migrate
pnpm --filter @matriz/db seed

if [ "${PROCESS_ROLE}" = "worker" ]; then
  exec pnpm --filter @matriz/worker start
fi

exec pnpm --filter @matriz/web start
