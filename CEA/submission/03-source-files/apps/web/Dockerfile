# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json

RUN npm ci --workspace web --include-workspace-root

COPY apps/web ./apps/web

ARG API_INTERNAL_URL=http://api:3000
ARG NEXT_PUBLIC_API_BASE_URL=/api
ENV API_INTERNAL_URL=$API_INTERNAL_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npm run build --workspace web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --chown=node:node --from=build /repo/apps/web/.next/standalone ./
COPY --chown=node:node --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --chown=node:node --from=build /repo/apps/web/public ./apps/web/public
RUN mkdir -p /app/apps/web/.next/cache && chown -R node:node /app/apps/web/.next

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
