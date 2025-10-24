# Multi-stage build para DashDocker

# Stage 1: Build Frontend
FROM node:18-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Build Backend Dependencies
FROM node:18-alpine AS build-backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Stage 3: Base Image (compartilhada)
FROM node:18-alpine AS base
WORKDIR /app

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Copiar dependências do backend
COPY --from=build-backend /app/backend/node_modules ./backend/node_modules
COPY --from=build-backend /app/backend/package*.json ./backend/

# Copiar código do backend
COPY backend/src ./backend/src

# Copiar build do frontend
COPY --from=build-frontend /app/frontend/dist ./frontend/dist

# Stage 4: Dashboard Image
FROM base AS dashboard
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1
CMD ["node", "/app/backend/src/server.js"]

# Stage 5: Agent Image
FROM base AS agent
# Copiar apenas o agente
COPY backend/src/agent.js ./
COPY backend/src/utils ./utils

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dashdocker -u 1001 && \
    chown -R dashdocker:nodejs /app
USER dashdocker

EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1
CMD ["node", "agent.js"]
