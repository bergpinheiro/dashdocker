const Docker = require('dockerode');
const { io } = require('socket.io-client');

class DashDockerAgent {
  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.socket = null;
    this.nodeId = process.env.NODE_NAME || require('os').hostname();
    this.backendUrl = process.env.BACKEND_URL || 'ws://dashdocker:3001';
    this.updateInterval = parseInt(process.env.AGENT_UPDATE_INTERVAL) || 5000;
    this.isConnected = false;
    this.containers = new Map();
    this.statsStreams = new Map();
  }

  /**
   * Inicia o agent
   */
  async start() {
    console.log(`🤖 Iniciando DashDocker Agent no node: ${this.nodeId}`);
    
    try {
      // Conectar ao backend
      await this.connectToBackend();
      
      // Iniciar coleta de dados
      this.startDataCollection();
      
      console.log('✅ Agent iniciado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao iniciar agent:', error);
      process.exit(1);
    }
  }

  /**
   * Conecta ao backend via WebSocket
   */
  async connectToBackend() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Conectando ao backend: ${this.backendUrl}`);
      
      this.socket = io(`${this.backendUrl}/agents`, {
        path: '/socket.io',
        transports: ['websocket'],
        timeout: 30000,
        reconnection: true,
        reconnectionDelay: 10000,
        reconnectionAttempts: Infinity,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('✅ Conectado ao backend');
        this.isConnected = true;
        
        // Entrar no namespace dos agents
        this.socket.emit('agent:register', {
          nodeId: this.nodeId,
          timestamp: Date.now()
        });
        
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('⚠️ Desconectado do backend:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Erro de conexão:', error.message);
        // Não rejeitar imediatamente, deixar o sistema de reconexão funcionar
        console.log('🔄 Tentando reconectar em 10 segundos...');
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconectado após ${attemptNumber} tentativas`);
        this.isConnected = true;
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Tentativa de reconexão ${attemptNumber}...`);
      });

      // Timeout para resolver a promise
      setTimeout(() => {
        if (!this.isConnected) {
          console.log('⏰ Timeout de conexão, mas continuando com reconexão automática...');
          resolve(); // Resolver para não travar o agent
        }
      }, 30000);
    });
  }

  /**
   * Inicia coleta periódica de dados
   */
  startDataCollection() {
    // Coletar dados imediatamente
    this.collectAndSendData();
    
    // Configurar intervalo
    setInterval(() => {
      this.collectAndSendData();
    }, this.updateInterval);
    
    console.log(`📊 Coleta de dados iniciada (intervalo: ${this.updateInterval}ms)`);
  }

  /**
   * Coleta e envia dados para o backend
   */
  async collectAndSendData() {
    if (!this.isConnected) {
      console.log('⚠️ Backend não conectado, pulando coleta de dados');
      return;
    }

    try {
      console.log('📊 Coletando dados do node...');
      
      // Coletar containers
      const containers = await this.getContainers();
      
      // Coletar stats
      const stats = await this.getContainersStats(containers);
      
      // Coletar eventos (últimos 5 segundos)
      const events = await this.getRecentEvents();
      
      // Preparar dados para envio
      const data = {
        nodeId: this.nodeId,
        timestamp: Date.now(),
        containers: containers,
        stats: stats,
        events: events
      };
      
      // Enviar para o backend
      this.socket.emit('agent:data', data);
      
      console.log(`📤 Dados enviados: ${containers.length} containers, ${Object.keys(stats).length} stats`);
      
    } catch (error) {
      console.error('❌ Erro na coleta de dados:', error);
    }
  }

  /**
   * Obtém lista de containers
   */
  async getContainers() {
    try {
      const containers = await this.docker.listContainers({ all: true });
      
      return containers.map(container => ({
        id: container.Id,
        name: container.Names[0]?.replace('/', '') || container.Id.substring(0, 12),
        image: container.Image,
        status: container.Status,
        state: container.State,
        created: container.Created,
        ports: container.Ports,
        labels: container.Labels || {},
        command: container.Command
      }));
    } catch (error) {
      console.error('❌ Erro ao listar containers:', error);
      return [];
    }
  }

  /**
   * Obtém stats dos containers
   */
  async getContainersStats(containers) {
    const stats = {};
    
    for (const container of containers) {
      try {
        const containerObj = this.docker.getContainer(container.id);
        const containerStats = await containerObj.stats({ stream: false });
        
        // Processar stats
        const cpuDelta = containerStats.cpu_stats.cpu_usage.total_usage - 
                        containerStats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = containerStats.cpu_stats.system_cpu_usage - 
                           containerStats.precpu_stats.system_cpu_usage;
        const cpuPercent = (cpuDelta / systemDelta) * 100.0;
        
        const memoryUsage = containerStats.memory_stats.usage || 0;
        const memoryLimit = containerStats.memory_stats.limit || 0;
        const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100.0 : 0;
        
        stats[container.id] = {
          cpu: {
            percent: Math.round(cpuPercent * 100) / 100,
            usage: cpuDelta,
            system: systemDelta
          },
          memory: {
            percent: Math.round(memoryPercent * 100) / 100,
            usage: memoryUsage,
            limit: memoryLimit
          },
          network: {
            rx_bytes: containerStats.networks?.eth0?.rx_bytes || 0,
            tx_bytes: containerStats.networks?.eth0?.tx_bytes || 0
          },
          block: {
            read: containerStats.blkio_stats?.io_service_bytes_read || 0,
            write: containerStats.blkio_stats?.io_service_bytes_write || 0
          }
        };
        
      } catch (error) {
        console.error(`❌ Erro ao obter stats do container ${container.id}:`, error.message);
        stats[container.id] = null;
      }
    }
    
    return stats;
  }

  /**
   * Obtém eventos recentes
   */
  async getRecentEvents() {
    try {
      const events = await this.docker.getEvents({
        since: Math.floor((Date.now() - 5000) / 1000), // Últimos 5 segundos
        until: Math.floor(Date.now() / 1000)
      });
      
      const eventList = [];
      let data = '';
      
      events.on('data', chunk => {
        data += chunk.toString();
        const lines = data.split('\n');
        data = lines.pop(); // Manter última linha incompleta
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const event = JSON.parse(line);
              eventList.push({
                type: event.Type,
                action: event.Action,
                id: event.id,
                from: event.from,
                time: event.time,
                timeNano: event.timeNano
              });
            } catch (parseError) {
              // Ignorar linhas inválidas
            }
          }
        }
      });
      
      return new Promise((resolve) => {
        events.on('end', () => {
          resolve(eventList);
        });
        
        // Timeout após 1 segundo
        setTimeout(() => {
          events.destroy();
          resolve(eventList);
        }, 1000);
      });
      
    } catch (error) {
      console.error('❌ Erro ao obter eventos:', error);
      return [];
    }
  }

  /**
   * Para o agent
   */
  stop() {
    console.log('🛑 Parando agent...');
    
    // Parar streams de stats
    for (const stream of this.statsStreams.values()) {
      stream.destroy();
    }
    this.statsStreams.clear();
    
    // Desconectar do backend
    if (this.socket) {
      this.socket.disconnect();
    }
    
    console.log('✅ Agent parado');
  }
}

// Inicializar agent
const agent = new DashDockerAgent();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, parando agent...');
  agent.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, parando agent...');
  agent.stop();
  process.exit(0);
});

// Iniciar agent
agent.start().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
