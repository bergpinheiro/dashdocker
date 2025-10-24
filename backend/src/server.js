require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Importar serviços
const { testConnection } = require('./config/docker');
const dockerService = require('./services/dockerService');
const statsService = require('./services/statsService');
const eventService = require('./services/eventService');
const notificationService = require('./services/notificationService');

// Importar rotas
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const containersRoutes = require('./routes/containers');
const notificationsRoutes = require('./routes/notifications');

// Importar middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas públicas
app.use('/api/auth', authRoutes);

// Rotas protegidas
app.use('/api/services', authenticateToken, servicesRoutes);
app.use('/api/containers', authenticateToken, containersRoutes);
app.use('/api/notify', authenticateToken, notificationsRoutes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rota raiz - servir o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// Catch-all para SPA (todas as rotas não-API servem o index.html)
app.get('*', (req, res) => {
  // Se for uma rota de API, retornar 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint não encontrado'
    });
  }
  // Caso contrário, servir o SPA
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// WebSocket para stats em tempo real
io.on('connection', (socket) => {
  console.log(`📱 Cliente conectado: ${socket.id}`);
  
  // Enviar stats de todos os containers a cada 5 segundos
  const statsInterval = setInterval(async () => {
    try {
      const stats = await statsService.getAllContainersStats();
      socket.emit('stats', stats);
    } catch (error) {
      console.error('Erro ao enviar stats:', error);
    }
  }, 5000);

  // Enviar notificação de confirmação
  socket.on('notification:test', async (data) => {
    try {
      const result = await notificationService.sendTestNotification();
      socket.emit('notification:sent', result);
    } catch (error) {
      socket.emit('notification:error', { error: error.message });
    }
  });

  // Cleanup quando cliente desconecta
  socket.on('disconnect', () => {
    console.log(`📱 Cliente desconectado: ${socket.id}`);
    clearInterval(statsInterval);
  });
});

// Inicializar monitoramento de eventos
eventService.startMonitoring((eventType, data) => {
  io.emit(eventType, data);
});

// Função de inicialização
async function startServer() {
  try {
    // Testar conexão com Docker
    const dockerConnected = await testConnection();
    if (!dockerConnected) {
      console.error('❌ Não foi possível conectar ao Docker Engine');
      process.exit(1);
    }

    // Verificar configuração do Waha
    const wahaConfig = notificationService.getConfig();
    if (wahaConfig.isConfigured) {
      console.log('✅ Waha API configurada');
      const status = await notificationService.checkWahaStatus();
      if (status.available) {
        console.log('✅ Waha API disponível');
      } else {
        console.warn('⚠️ Waha API não disponível:', status.error);
      }
    } else {
      console.warn('⚠️ Waha API não configurada - notificações desabilitadas');
    }

    // Iniciar servidor
    server.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}/socket.io`);
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  eventService.stopMonitoring();
  statsService.stopAllStreams();
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  eventService.stopMonitoring();
  statsService.stopAllStreams();
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

// Iniciar servidor
startServer();
