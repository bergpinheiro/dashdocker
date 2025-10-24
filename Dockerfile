# Multi-stage build para DashDocker (Dashboard + Agente)

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

# Stage 3: Dashboard Image
FROM node:18-alpine AS dashboard
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

# Expor porta do dashboard
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Comando de inicialização do dashboard
CMD ["node", "/app/backend/src/server.js"]

# Stage 4: Agent Image
FROM node:18-alpine AS agent
WORKDIR /app

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Copiar dependências do backend
COPY --from=build-backend /app/backend/node_modules ./backend/node_modules
COPY --from=build-backend /app/backend/package*.json ./backend/

# Copiar código do agente
COPY backend/src/agent.js ./
COPY backend/src/utils ./utils

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dashdocker -u 1001

# Mudar propriedade dos arquivos
RUN chown -R dashdocker:nodejs /app
USER dashdocker

# Expor porta do agente
EXPOSE 3002

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Comando de inicialização do agente
CMD ["node", "agent.js"]
