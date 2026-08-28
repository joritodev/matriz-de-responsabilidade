FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.base.json ./

RUN npm ci
RUN npm run build -w @matriz/web

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000 3001

ENTRYPOINT ["/docker-entrypoint.sh"]
