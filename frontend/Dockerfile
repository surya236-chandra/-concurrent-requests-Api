# Stage 1: Build production assets using Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for Docker cache optimization
COPY package*.json ./
RUN npm ci

# Copy source code and config
COPY . .

# Environment variables for frontend build
ARG VITE_API_URL=http://localhost:3000/api
ARG VITE_SOCKET_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Build production bundle
RUN npm run build

# Stage 2: Production Nginx server
FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Healthcheck to verify Nginx is responding
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
