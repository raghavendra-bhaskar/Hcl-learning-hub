# ── Stage 1: Build the React / Vite frontend ─────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Install root dependencies (React, Vite, TailwindCSS, etc.)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy all frontend source files
COPY index.html vite.config.js tailwind.config.js postcss.config.js ./
COPY src/   ./src/
COPY public/ ./public/

# Build — VITE_API_URL is intentionally empty so the browser sends /api/* requests
# to the same origin, which nginx then proxies to the backend container.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Serve built assets with nginx ───────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config (proxies /api → backend, serves SPA for everything else)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
