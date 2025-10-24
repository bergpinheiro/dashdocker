# 🐳 DashDocker - Monitoramento Docker em Tempo Real

Dashboard web completo para monitoramento de serviços Docker e seus containers em tempo real, com sistema de notificação automática via WhatsApp.

![Dashboard Preview](https://via.placeholder.com/800x400/1f2937/ffffff?text=DashDocker+Preview)

## ✨ Funcionalidades

### 📊 Monitoramento em Tempo Real
- **Listagem de Serviços**: Visualize todos os serviços Docker e seus containers
- **Estatísticas de CPU e Memória**: Consumo em tempo real com gráficos interativos
- **Status de Containers**: Running, exited, restarting, paused, unhealthy, etc.
- **WebSocket**: Atualizações automáticas a cada 5 segundos
- **Logs de Containers**: Visualização e download de logs recentes

### 🔔 Sistema de Notificações
- **Alertas Automáticos**: Notificações via WhatsApp quando containers param ou ficam unhealthy
- **Integração Waha API**: Envio automático de mensagens formatadas
- **Eventos Monitorados**: die, start, restart, health_status, oom, kill
- **Retry Inteligente**: Sistema de tentativas com backoff exponencial

### 🎨 Interface Moderna
- **Design Responsivo**: Funciona perfeitamente em desktop e mobile
- **Tema Dark**: Interface moderna e elegante
- **Gráficos Interativos**: Charts em tempo real com Recharts
- **Navegação Intuitiva**: Dashboard principal e páginas de detalhes

### 🐝 Monitoramento de Cluster
- **Arquitetura Híbrida**: Dashboard no manager + monitores em todos os nodes
- **Descoberta Automática**: Detecta todos os nodes do cluster
- **Agregação de Dados**: Monitora containers de todos os nodes
- **Informações de Node**: Mostra em qual node cada container está rodando
- **Escalabilidade**: Adiciona novos nodes automaticamente
- **Cloudflare Tunnel**: Funciona perfeitamente com o dashboard no manager

### 🚀 Containerização Otimizada
- **Docker Multi-stage**: Imagem final de apenas ~170MB
- **Alpine Linux**: Base minimalista para máxima performance
- **Modo Global**: Roda em todos os nodes do Swarm
- **Recursos Otimizados**: CPU e memória limitados por node

## 🏗️ Arquitetura

### 📊 **Dashboard Principal (Manager)**
- **Localização**: Apenas no node manager
- **Porta**: 8080 (exposta)
- **Função**: Interface web + API + WebSocket
- **Cloudflare Tunnel**: Aponte para `dashdocker_dashdocker`

### 🤖 **Monitores (Todos os Nodes)**
- **Localização**: Todos os nodes do Swarm
- **Porta**: Nenhuma (modo interno)
- **Função**: Coleta de dados + descoberta de nodes
- **Recursos**: Mínimos (0.1 CPU, 64MB RAM)

### 🔄 **Fluxo de Dados**
1. **Monitores** coletam dados de cada node
2. **Dashboard** agrega dados de todos os monitores
3. **Frontend** recebe dados via WebSocket
4. **Cloudflare Tunnel** expõe apenas o dashboard

## 🛠️ Tecnologias

### Backend
- **Node.js 18+** - Runtime JavaScript
- **Express** - Framework web
- **Dockerode** - Cliente Docker para Node.js
- **Socket.io** - WebSocket para tempo real
- **Axios** - Cliente HTTP para Waha API
- **JWT** - Autenticação de usuários
- **bcryptjs** - Hash de senhas

### Frontend
- **React 18** - Biblioteca de interface
- **Vite** - Build tool moderno
- **TailwindCSS** - Framework CSS
- **React Router** - Roteamento
- **Recharts** - Gráficos interativos
- **Socket.io Client** - WebSocket client

### Infraestrutura
- **Docker Swarm** - Orquestração de containers
- **Docker Compose** - Desenvolvimento local
- **Nginx** - Servidor web e proxy reverso
- **Waha API** - Integração WhatsApp

## 📋 Pré-requisitos

- **Docker** e **Docker Swarm** instalados
- **Node.js 18+** (para desenvolvimento local)
- **API Waha** configurada (opcional, para notificações)

## 🚀 Instalação

### 1. Clone o repositório
```bash
git clone <repository-url>
cd dashdocker
```

### 2. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

### 3. Deploy no Docker Swarm
```bash
# Deploy completo (imagem construída automaticamente)
docker stack deploy -c docker-stack.yml dashdocker
```

### 4. Verificar serviços
```bash
# Ver todos os serviços
docker service ls

# Deve mostrar:
# - dashdocker_dashdocker (dashboard principal no manager)
# - dashdocker_dashdocker-monitor (monitores em todos os nodes)
```

### 5. Acessar o Dashboard
```bash
# O dashboard estará disponível apenas no node manager
# Acesse: http://localhost:8080 (ou IP do manager)
# Cloudflare Tunnel: aponte para o serviço dashdocker_dashdocker
```

Edite o arquivo `.env` com suas configurações:
```env
# Backend Configuration
PORT=3001
DOCKER_HOST=unix:///var/run/docker.sock
NODE_ENV=production

# Waha API Configuration (WhatsApp Notifications)
WAHA_URL=http://localhost:3000
WAHA_TOKEN=seu_token_aqui
WAHA_SESSION=default
WAHA_PHONE=5511999999999

# Cloudflare Tunnel (Optional)
CLOUDFLARE_TUNNEL_TOKEN=seu_token_cloudflare

# Frontend Configuration
VITE_API_URL=http://localhost:3001
```

### 3. Execute com Docker Swarm (Recomendado)
```bash
# Inicializar swarm (se não estiver inicializado)
docker swarm init

# Build da imagem
docker build -t dashdocker:latest .

# Deploy da stack
docker stack deploy -c docker-stack.yml dashdocker

# Verificar serviços
docker service ls

# Verificar logs
docker service logs dashdocker_dashdocker

# Escalar serviço (se necessário)
docker service scale dashdocker_dashdocker=2

# Atualizar stack
docker stack deploy -c docker-stack.yml dashdocker

# Remover stack
docker stack rm dashdocker
```

### 4. Execute com Docker Compose (Desenvolvimento)
```bash
# Build e execução
docker-compose up -d --build

# Verificar logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

### 5. Acesso e Autenticação
- **Dashboard**: http://localhost:8080
- **API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

#### 🔐 Login do Dashboard
- **Usuário padrão**: `admin`
- **Senha padrão**: `admin123`
- Configure as credenciais no arquivo `.env`:
  ```env
  DASHBOARD_USERNAME=seu_usuario
  DASHBOARD_PASSWORD=sua_senha_forte
  ```

## 🔧 Desenvolvimento Local

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Executar ambos
```bash
# Na raiz do projeto
npm run install:all
npm run dev
```

## 📱 Configuração WhatsApp (Waha API)

### 1. Instalar Waha
```bash
# Usando Docker
docker run -d --name waha -p 3000:3000 devlikeapro/waha
```

### 2. Configurar API
1. Acesse http://localhost:3000
2. Crie uma sessão WhatsApp
3. Escaneie o QR Code com seu WhatsApp
4. Copie o token da API
5. Configure no arquivo `.env`

### 3. Testar Notificação
```bash
curl -X POST http://localhost:3001/api/notify/test
```

## 🌐 Exposição Externa (Cloudflare Tunnel)

### 1. Criar Tunnel
1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vá para **Zero Trust** → **Access** → **Tunnels**
3. Clique em **Create a tunnel**
4. Copie o token gerado

### 2. Configurar
```bash
# Adicionar token ao .env
CLOUDFLARE_TUNNEL_TOKEN=seu_token_aqui

# Executar com tunnel
docker-compose --profile tunnel up -d
```

### 3. Configurar Hostname
1. No Cloudflare, configure o Public Hostname:
   - **Hostname**: `dashboard.seudominio.com`
   - **Service**: `http://dashdocker:80`
   - **Path**: (deixar vazio)

## 📊 Uso

### Dashboard Principal
- **Visão Geral**: Cards com estatísticas gerais
- **Lista de Serviços**: Cards clicáveis com status e métricas
- **Atualizações em Tempo Real**: Dados atualizados automaticamente
- **Indicadores de Status**: Cores indicam saúde dos containers

### Detalhes do Serviço
- **Informações Completas**: Nome, imagem, réplicas, portas
- **Tabela de Containers**: Status, CPU, memória, uptime
- **Gráficos de Performance**: CPU e memória em tempo real
- **Logs**: Visualização e download de logs

### Notificações
- **Automáticas**: Enviadas quando containers param ou ficam unhealthy
- **Formato**: Mensagem estruturada com nome, motivo e horário
- **Retry**: Sistema de tentativas em caso de falha

## 🔧 Comandos Úteis

### Docker Swarm
```bash
# Verificar status do swarm
docker node ls

# Ver logs do serviço
docker service logs -f dashdocker_dashdocker

# Escalar serviço
docker service scale dashdocker_dashdocker=3

# Atualizar imagem do serviço
docker service update --image dashdocker:latest dashdocker_dashdocker

# Ver detalhes do serviço
docker service inspect dashdocker_dashdocker

# Ver tarefas do serviço
docker service ps dashdocker_dashdocker

# Remover stack
docker stack rm dashdocker
```

### Docker Compose (Desenvolvimento)
```bash
# Rebuild da imagem
docker-compose build --no-cache

# Ver logs específicos
docker-compose logs -f dashdocker

# Executar comando no container
docker-compose exec dashdocker sh

# Limpar volumes e imagens
docker-compose down -v --rmi all
```

### Desenvolvimento
```bash
# Instalar dependências
npm run install:all

# Executar em modo desenvolvimento
npm run dev

# Build de produção
npm run build

# Lint do código
cd frontend && npm run lint
```

## 📁 Estrutura do Projeto

```
dashdocker/
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── config/         # Configurações Docker
│   │   ├── services/       # Serviços de negócio
│   │   ├── routes/         # Endpoints da API
│   │   └── utils/          # Utilitários
│   └── package.json
├── frontend/               # SPA React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── hooks/          # Hooks personalizados
│   │   ├── utils/          # Utilitários
│   │   └── styles/         # Estilos CSS
│   └── package.json
├── docker-compose.yml      # Orquestração de containers
├── Dockerfile             # Build multi-stage
├── nginx.conf             # Configuração Nginx
└── README.md
```

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão Docker
```bash
# Verificar se Docker está rodando
docker ps

# Verificar permissões do socket
ls -la /var/run/docker.sock
```

#### 2. WebSocket não conecta
- Verificar se a porta 3001 está liberada
- Verificar configuração do VITE_API_URL
- Verificar logs do backend

#### 3. Notificações não funcionam
- Verificar se Waha está rodando
- Verificar token e configurações
- Testar API manualmente

#### 4. Container não inicia
```bash
# Verificar logs detalhados
docker-compose logs dashdocker

# Verificar recursos disponíveis
docker stats
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- [Docker](https://www.docker.com/) - Plataforma de containerização
- [React](https://reactjs.org/) - Biblioteca de interface
- [TailwindCSS](https://tailwindcss.com/) - Framework CSS
- [Waha](https://github.com/devlikeapro/waha) - API WhatsApp
- [Cloudflare](https://www.cloudflare.com/) - Tunnel e proteção

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentação**: [Wiki](https://github.com/your-repo/wiki)
- **Email**: suporte@dashdocker.com

---

**Desenvolvido com ❤️ para a comunidade Docker**
