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

# Healthcheck - verificar se consegue conectar ao Docker
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:2375/version || exit 1

# Comando de inicialização
CMD ["node", "src/agent.js"]
