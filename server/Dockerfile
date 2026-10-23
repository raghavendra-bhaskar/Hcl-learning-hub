FROM node:20-alpine AS build
RUN apk add --no-cache openssl openssl-dev
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/tsconfig.json ./tsconfig.json
COPY server/src ./src
COPY src/data ./data
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/data ./data

# Runtime data directory — holds oidc-config.json (Okta settings saved by admin UI).
# Mount a named volume here so config persists across container restarts.
RUN mkdir -p /app/data

EXPOSE 4000

# Run DB migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
