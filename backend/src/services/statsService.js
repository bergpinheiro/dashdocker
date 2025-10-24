const { docker } = require('../config/docker');
const { calculateCpuPercent, calculateMemoryUsage } = require('../utils/statsCalculator');
const alertService = require('./alertService');

/**
 * Serviço para coleta de estatísticas em tempo real
 */
class StatsService {
  constructor() {
    this.activeStreams = new Map();
  }

  /**
   * Inicia streaming de stats para um container
   * @param {string} containerId - ID do container
   * @param {Function} callback - Callback para receber stats
   * @returns {Object} Stream de stats
   */
  startStatsStream(containerId, callback) {
    try {
      const container = docker.getContainer(containerId);
      
      // Parar stream anterior se existir
      this.stopStatsStream(containerId);
      
      const stream = container.stats({ stream: true }, (err, stats) => {
        if (err) {
          console.error(`Erro no stream de stats para ${containerId}:`, err);
          return;
        }
        
        this.processStats(stats, callback);
      });
      
      this.activeStreams.set(containerId, stream);
      return stream;
    } catch (error) {
      console.error('Erro ao iniciar stream de stats:', error);
      throw error;
    }
  }

  /**
   * Para streaming de stats para um container
   * @param {string} containerId - ID do container
   */
  stopStatsStream(containerId) {
    const stream = this.activeStreams.get(containerId);
    if (stream) {
      stream.destroy();
      this.activeStreams.delete(containerId);
    }
  }

  /**
   * Para todos os streams ativos
   */
  stopAllStreams() {
    this.activeStreams.forEach((stream, containerId) => {
      stream.destroy();
    });
    this.activeStreams.clear();
  }

  /**
   * Processa estatísticas brutas do Docker
   * @param {Object} rawStats - Stats brutos do Docker
   * @param {Function} callback - Callback para enviar stats processados
   */
  processStats(rawStats, callback) {
    try {
      const stats = {
        containerId: rawStats.id,
        timestamp: new Date().toISOString(),
        cpu: {
          percent: calculateCpuPercent(rawStats),
          cores: rawStats.cpu_stats.online_cpus || 0
        },
        memory: calculateMemoryUsage(rawStats),
        network: this.calculateNetworkStats(rawStats),
        blockIO: this.calculateBlockIOStats(rawStats)
      };

      // Verificar alertas de recursos
      this.checkResourceAlerts(stats);

      callback(stats);
    } catch (error) {
      console.error('Erro ao processar stats:', error);
    }
  }

  /**
   * Calcula estatísticas de rede
   * @param {Object} rawStats - Stats brutos
   * @returns {Object} Stats de rede
   */
  calculateNetworkStats(rawStats) {
    try {
      const networks = rawStats.networks || {};
      let totalRx = 0;
      let totalTx = 0;

      Object.values(networks).forEach(network => {
        totalRx += network.rx_bytes || 0;
        totalTx += network.tx_bytes || 0;
      });

      return {
        rxBytes: totalRx,
        txBytes: totalTx,
        rxBytesFormatted: this.formatBytes(totalRx),
        txBytesFormatted: this.formatBytes(totalTx)
      };
    } catch (error) {
      console.error('Erro ao calcular stats de rede:', error);
      return { rxBytes: 0, txBytes: 0, rxBytesFormatted: '0 B', txBytesFormatted: '0 B' };
    }
  }

  /**
   * Calcula estatísticas de I/O de bloco
   * @param {Object} rawStats - Stats brutos
   * @returns {Object} Stats de I/O
   */
  calculateBlockIOStats(rawStats) {
    try {
      const blkio = rawStats.blkio_stats || {};
      const ioServiceBytes = blkio.io_service_bytes_recursive || [];
      
      let readBytes = 0;
      let writeBytes = 0;

      ioServiceBytes.forEach(io => {
        if (io.op === 'Read') {
          readBytes += io.value || 0;
        } else if (io.op === 'Write') {
          writeBytes += io.value || 0;
        }
      });

      return {
        readBytes,
        writeBytes,
        readBytesFormatted: this.formatBytes(readBytes),
        writeBytesFormatted: this.formatBytes(writeBytes)
      };
    } catch (error) {
      console.error('Erro ao calcular stats de I/O:', error);
      return { readBytes: 0, writeBytes: 0, readBytesFormatted: '0 B', writeBytesFormatted: '0 B' };
    }
  }

  /**
   * Obtém stats de todos os containers do cluster
   * @returns {Promise<Array>} Stats de todos os containers
   */
  async getAllContainersStats() {
    try {
      // Obter containers locais
      const containers = await docker.listContainers({ all: true });
      const stats = [];
      
      for (const container of containers) {
        try {
          const containerObj = docker.getContainer(container.Id);
          const containerStats = await containerObj.stats({ stream: false });
          
          const cpuDelta = containerStats.cpu_stats.cpu_usage.total_usage - 
                          containerStats.precpu_stats.cpu_usage.total_usage;
          const systemDelta = containerStats.cpu_stats.system_cpu_usage - 
                             containerStats.precpu_stats.system_cpu_usage;
          const cpuPercent = (cpuDelta / systemDelta) * 100.0;
          
          const memoryUsage = containerStats.memory_stats.usage || 0;
          const memoryLimit = containerStats.memory_stats.limit || 0;
          const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100.0 : 0;
          
          stats.push({
            id: container.Id,
            name: container.Names[0]?.replace('/', '') || container.Id.substring(0, 12),
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
            }
          });
        } catch (error) {
          console.error(`Erro ao obter stats do container ${container.Id}:`, error.message);
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Erro ao obter stats do cluster:', error);
      throw error;
    }
  }

  /**
   * Verifica alertas de recursos para um container
   * @param {Object} stats - Estatísticas do container
   */
  async checkResourceAlerts(stats) {
    try {
      // Obter informações do container
      const container = docker.getContainer(stats.containerId);
      const containerInfo = await container.inspect();
      
      const containerData = {
        id: stats.containerId,
        name: containerInfo.Name.replace('/', ''),
        image: containerInfo.Config.Image,
        status: containerInfo.State.Status,
        health: containerInfo.State.Health?.Status
      };
      
      // Verificar alertas de recursos
      alertService.checkResourceAlerts(stats, containerData);
    } catch (error) {
      console.error('Erro ao verificar alertas de recursos:', error);
    }
  }

  /**
   * Verifica alertas de saúde e containers parados
   * @param {Array} containers - Lista de containers
   */
  async checkContainerAlerts(containers) {
    try {
      // Verificar saúde dos containers
      await alertService.checkContainerHealth(containers);
      
      // Verificar containers parados há muito tempo
      await alertService.checkStoppedContainers(containers);
    } catch (error) {
      console.error('Erro ao verificar alertas de containers:', error);
    }
  }

  /**
   * Formata bytes para unidades legíveis
   * @param {number} bytes - Número de bytes
   * @returns {string} String formatada
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = new StatsService();
