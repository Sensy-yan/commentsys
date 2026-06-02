FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY server/package.json server/
COPY apps/customer/package.json apps/customer/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter server build
RUN pnpm --filter customer build
RUN pnpm --filter admin build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache sqlite
RUN corepack enable

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/src/schema.sql ./server/dist/
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/apps/customer/dist ./public/customer
COPY --from=builder /app/apps/admin/dist ./public/admin
COPY --from=builder /app/seed-data ./seed-data

EXPOSE 8787
WORKDIR /app/server
CMD ["node", "dist/index.js"]
