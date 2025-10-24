# 🤖 Sistema de Agentes DashDocker

O DashDocker agora suporta monitoramento distribuído usando agentes em cada node do Docker Swarm, similar ao Portainer.

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Node Manager  │    │   Node Worker   │    │   Node Worker   │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ DashDocker  │ │    │ │   Agente    │ │    │ │   Agente    │ │
│ │   (Main)    │ │◄───┤ │ DashDocker  │ │    │ │ DashDocker  │ │
│ │             │ │    │ │             │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Instalação

### 1. Deploy do Agente em Todos os Nodes

```bash
# Deploy do agente em modo global (todos os nodes)
docker stack deploy -c docker-compose.agent.yml dashdocker-agents
```

### 2. Deploy do Dashboard Principal

```bash
# Deploy do dashboard principal (apenas no manager)
docker stack deploy -c docker-stack.yml dashdocker
```

## 📋 Arquivos de Configuração

### `docker-compose.agent.yml`
```yaml
version: '3.8'
services:
  dashdocker-agent:
    build:
      context: .
      dockerfile: Dockerfile.agent
    image: dashdocker-agent:latest
    ports:
      - "3002:3002"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - NODE_ENV=production
      - AGENT_PORT=3002
    deploy:
      mode: global  # Roda em todos os nodes
      resources:
        limits:
          cpus: '0.1'
          memory: 64M
```

### `Dockerfile.agent`
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/src/agent.js ./
COPY backend/src/utils ./utils
EXPOSE 3002
CMD ["node", "agent.js"]
```

## 🔧 Funcionamento

### 1. Descoberta Automática
- O dashboard principal descobre automaticamente agentes nos nodes
- Verifica a cada 1 minuto por novos agentes
- Cache de agentes ativos para performance

### 2. Coleta de Dados
- **Containers**: Coletados de todos os agentes
- **Stats**: CPU/Memória de todos os nodes
- **Logs**: Acessíveis via agente local
- **Eventos**: Monitorados em tempo real

### 3. Fallback Inteligente
- Se agentes não estiverem disponíveis, usa API local
- Modo standalone funciona normalmente
- Detecção automática de modo Swarm

## 📊 APIs do Agente

### Health Check
```bash
GET http://node-ip:3002/health
```

### Containers
```bash
GET http://node-ip:3002/containers
```

### Stats
```bash
GET http://node-ip:3002/stats
```

### Logs
```bash
GET http://node-ip:3002/containers/{id}/logs?tail=100
```

### Node Info
```bash
GET http://node-ip:3002/node/info
```

## 🎯 Vantagens

### ✅ Monitoramento Completo
- **Todos os containers** de todos os nodes
- **Stats em tempo real** de todo o cluster
- **Logs centralizados** de qualquer node

### ✅ Performance
- **Coleta distribuída** (não sobrecarrega o manager)
- **Cache inteligente** de agentes
- **Fallback automático** se agente falhar

### ✅ Escalabilidade
- **Adiciona nodes** automaticamente
- **Remove nodes** sem interrupção
- **Recursos mínimos** por agente (64MB RAM)

## 🔍 Verificação

### 1. Verificar Agentes
```bash
# Listar serviços do agente
docker service ls | grep dashdocker-agent

# Ver logs do agente
docker service logs dashdocker_dashdocker-agent
```

### 2. Verificar Descoberta
```bash
# Logs do dashboard principal
docker service logs dashdocker_dashdocker

# Deve mostrar:
# ✅ X agentes descobertos
# 📡 Agente: node-name (ip) - Status: active
```

### 3. Testar APIs
```bash
# Testar agente local
curl http://localhost:3002/health

# Testar agente remoto
curl http://node-ip:3002/health
```

## 🛠️ Troubleshooting

### Agente não descoberto
```bash
# Verificar se porta 3002 está aberta
netstat -tlnp | grep 3002

# Verificar logs do agente
docker service logs dashdocker_dashdocker-agent
```

### Fallback para API local
```bash
# Verificar logs do dashboard
docker service logs dashdocker_dashdocker

# Deve mostrar:
# ⚠️ Nenhum agente encontrado, usando dados locais
```

### Performance
```bash
# Verificar recursos dos agentes
docker stats $(docker ps -q --filter "name=dashdocker-agent")
```

## 📈 Monitoramento

### Dashboard Principal
- **Swarm Info**: Informações do cluster
- **Nodes**: Lista de nodes e status
- **Agentes**: Status dos agentes
- **Containers**: De todos os nodes
- **Stats**: CPU/Memória distribuída

### Métricas por Node
- **Containers por node**
- **Recursos por node**
- **Status de saúde**
- **Uptime dos agentes**

## 🔒 Segurança

### Rede
- **Overlay network** para comunicação
- **Portas internas** (3002) não expostas externamente
- **Comunicação criptografada** entre nodes

### Recursos
- **Limites de CPU/Memória** por agente
- **Restart automático** em caso de falha
- **Health checks** regulares

## 🎉 Resultado

Com o sistema de agentes, o DashDocker agora monitora **todo o cluster Docker Swarm** de forma distribuída e eficiente, similar ao Portainer! 🚀
