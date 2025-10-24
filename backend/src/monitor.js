require('dotenv').config();
const clusterService = require('./services/clusterService');

/**
 * Modo Monitor - Roda em todos os nodes para coleta de dados
 * Não expõe portas, apenas coleta dados do cluster
 */
class MonitorMode {
  constructor() {
    this.isRunning = false;
    this.interval = null;
  }

  /**
   * Inicia o modo monitor
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Modo monitor já está rodando');
      return;
    }

    console.log('🔍 Iniciando modo monitor...');
    this.isRunning = true;

    // Tentar descobrir nodes do cluster (pode falhar em workers)
    try {
      await clusterService.discoverNodes();
      console.log('✅ Nodes do cluster descobertos');
    } catch (error) {
      console.log('⚠️ Não foi possível descobrir nodes (provavelmente worker node):', error.message);
      console.log('📊 Continuando com monitoramento local...');
    }

    // Iniciar coleta periódica de dados
    this.startDataCollection();

    console.log('✅ Modo monitor iniciado com sucesso');
  }

  /**
   * Inicia coleta periódica de dados
   */
  startDataCollection() {
    // Coletar dados a cada 30 segundos
    this.interval = setInterval(async () => {
      try {
        console.log('📊 Coletando dados do cluster...');
        
        // Tentar descobrir nodes (pode falhar em workers)
        try {
          await clusterService.discoverNodes();
        } catch (error) {
          console.log('⚠️ Não foi possível descobrir nodes (worker node)');
        }
        
        // Coletar containers (sempre funciona)
        try {
          const containers = await clusterService.getAllContainersFromCluster();
          console.log(`📦 ${containers.length} containers encontrados`);
        } catch (error) {
          console.log('⚠️ Erro ao coletar containers:', error.message);
        }
        
        // Coletar stats (sempre funciona)
        try {
          const stats = await clusterService.getAllStatsFromCluster();
          console.log(`📈 ${stats.length} stats coletados`);
        } catch (error) {
          console.log('⚠️ Erro ao coletar stats:', error.message);
        }
        
        // Coletar estatísticas do cluster (pode falhar em workers)
        try {
          const clusterStats = await clusterService.getClusterStats();
          console.log(`🐝 Cluster: ${clusterStats.totalNodes} nodes, ${clusterStats.totalContainers} containers`);
        } catch (error) {
          console.log('⚠️ Erro ao coletar stats do cluster (worker node)');
        }
        
      } catch (error) {
        console.error('❌ Erro na coleta de dados:', error);
      }
    }, 30000); // 30 segundos
  }

  /**
   * Para o modo monitor
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('🛑 Modo monitor parado');
  }
}

// Verificar se está em modo monitor
if (process.env.MONITOR_MODE === 'true') {
  console.log('🤖 Iniciando em modo monitor...');
  
  const monitor = new MonitorMode();
  
  // Iniciar monitor
  monitor.start().catch(error => {
    console.error('❌ Erro ao iniciar modo monitor:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, parando modo monitor...');
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT, parando modo monitor...');
    monitor.stop();
    process.exit(0);
  });
} else {
  console.log('🚀 Iniciando em modo dashboard...');
  // Importar e executar o servidor principal
  require('./server.js');
}
