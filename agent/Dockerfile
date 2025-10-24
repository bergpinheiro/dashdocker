# Multi-stage build para DashDocker Agent

# Stage 1: Build
FROM node:18-alpine AS build
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm install --omit=dev && npm cache clean --force

# Stage 2: Production
FROM node:18-alpine AS production
WORKDIR /app

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Copiar dependências do build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Copiar código do agent
COPY src/ ./src/

# Healthcheck removido - agent não expõe porta HTTP
# Agent verifica conectividade via WebSocket com o backend

# Comando de inicialização
CMD ["node", "src/agent.js"]
