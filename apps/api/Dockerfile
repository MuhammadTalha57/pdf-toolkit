# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages

RUN npm ci --workspace api --include-workspace-root

COPY apps/api ./apps/api

RUN npm run build --workspace api
RUN mkdir -p /repo/apps/api/node_modules

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --chown=node:node --from=build /repo/node_modules ./node_modules
COPY --chown=node:node --from=build /repo/apps/api/node_modules ./node_modules
COPY --chown=node:node --from=build /repo/apps/api/package.json ./package.json
COPY --chown=node:node --from=build /repo/apps/api/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
