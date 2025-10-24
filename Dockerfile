# Multi-stage build para imagem otimizada

# Stage 1: Build Frontend
FROM node:18-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ .
RUN npm run build

# Stage 2: Build Backend Dependencies
FROM node:18-alpine AS build-backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Production Image
FROM node:18-alpine AS production
WORKDIR /app

# Instalar nginx e dependências necessárias
RUN apk add --no-cache nginx-light && \
    rm -rf /var/cache/apk/*

# Copiar dependências do backend
COPY --from=build-backend /app/backend/node_modules ./backend/node_modules
COPY --from=build-backend /app/backend/package*.json ./backend/

# Copiar código do backend
COPY backend/src ./backend/src

# Copiar build do frontend
COPY --from=build-frontend /app/frontend/dist ./frontend/dist

# Configurar nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Criar script de inicialização
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'nginx &' >> /app/start.sh && \
    echo 'node /app/backend/src/server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expor portas
EXPOSE 80 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Comando de inicialização
CMD ["/app/start.sh"]
