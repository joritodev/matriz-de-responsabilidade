FROM node:22-bookworm-slim

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.base.json ./

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @matriz/web build

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000 3001

ENTRYPOINT ["/docker-entrypoint.sh"]
