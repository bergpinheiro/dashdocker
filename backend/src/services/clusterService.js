const { docker } = require('../config/docker');

/**
 * Serviço para monitoramento de cluster Docker Swarm
 */
class ClusterService {
  constructor() {
    this.nodes = [];
    this.lastDiscovery = 0;
    this.discoveryInterval = 30000; // 30 segundos
  }

  /**
   * Descobre todos os nodes do Swarm
   */
  async discoverNodes() {
    try {
      const now = Date.now();
      
      // Evitar descoberta muito frequente
      if (now - this.lastDiscovery < this.discoveryInterval) {
        return this.nodes;
      }

      console.log('🔍 Descobrindo nodes do Swarm...');
      
      // Obter lista de nodes
      const swarmNodes = await docker.listNodes();
      this.nodes = swarmNodes.map(node => ({
        id: node.ID,
        name: node.Description?.Hostname || 'unknown',
        role: node.Spec?.Role || 'unknown',
        status: node.Status?.State || 'unknown',
        availability: node.Spec?.Availability || 'unknown',
        address: node.Status?.Addr || 'unknown',
        engineVersion: node.Description?.Engine?.EngineVersion || 'unknown',
        createdAt: node.CreatedAt,
        updatedAt: node.UpdatedAt
      }));

      this.lastDiscovery = now;
      
      console.log(`✅ ${this.nodes.length} nodes descobertos`);
      this.nodes.forEach(node => {
        console.log(`📋 Node: ${node.name} (${node.role}) - Status: ${node.status}`);
      });
      
      return this.nodes;
    } catch (error) {
      console.error('❌ Erro ao descobrir nodes:', error);
      return this.nodes;
    }
  }

  /**
   * Obtém containers de todos os nodes
   */
  async getAllContainersFromCluster() {
    try {
      const nodes = await this.discoverNodes();
      const allContainers = [];

      // Para cada node, tentar obter containers
      for (const node of nodes) {
        try {
          // Usar a API local do Docker para obter containers
          // Em um Swarm, a API local já mostra containers de todos os nodes
          const containers = await docker.listContainers({ all: true });
          
          // Filtrar containers que pertencem a este node
          const nodeContainers = containers.map(container => ({
            ...container,
            nodeId: node.id,
            nodeName: node.name,
            nodeRole: node.role,
            nodeStatus: node.status
          }));

          allContainers.push(...nodeContainers);
        } catch (error) {
          console.error(`❌ Erro ao obter containers do node ${node.name}:`, error.message);
        }
      }

      // Remover duplicatas baseado no ID do container
      const uniqueContainers = allContainers.filter((container, index, self) => 
        index === self.findIndex(c => c.Id === container.Id)
      );

      console.log(`📦 ${uniqueContainers.length} containers únicos encontrados no cluster`);
      return uniqueContainers;
    } catch (error) {
      console.error('❌ Erro ao obter containers do cluster:', error);
      return [];
    }
  }

  /**
   * Obtém stats de todos os containers do cluster
   */
  async getAllStatsFromCluster() {
    try {
      const containers = await docker.listContainers();
      const statsPromises = containers.map(async (container) => {
        try {
          const containerObj = docker.getContainer(container.Id);
          const stats = await containerObj.stats({ stream: false });
          
          // Determinar qual node o container está rodando
          const nodeInfo = await this.getContainerNodeInfo(container.Id);
          
          return {
            containerId: container.Id,
            name: container.Names[0]?.replace('/', '') || 'sem-nome',
            status: container.State,
            cpu: {
              percent: this.calculateCpuPercent(stats),
              cores: stats.cpu_stats.online_cpus || 0
            },
            memory: this.calculateMemoryUsage(stats),
            network: this.calculateNetworkStats(stats),
            blockIO: this.calculateBlockIOStats(stats),
            timestamp: new Date().toISOString(),
            nodeId: nodeInfo.id,
            nodeName: nodeInfo.name,
            nodeRole: nodeInfo.role
          };
        } catch (error) {
          console.error(`Erro ao obter stats do container ${container.Id}:`, error);
          return null;
        }
      });

      const results = await Promise.all(statsPromises);
      return results.filter(stat => stat !== null);
    } catch (error) {
      console.error('Erro ao obter stats do cluster:', error);
      return [];
    }
  }

  /**
   * Tenta determinar em qual node um container está rodando
   */
  async getContainerNodeInfo(containerId) {
    try {
      // Em um Swarm, podemos tentar obter informações do container
      const container = await docker.getContainer(containerId).inspect();
      
      // Verificar se há informações de node no container
      if (container.Node) {
        return {
          id: container.Node.ID,
          name: container.Node.Name || 'unknown',
          role: 'worker' // Assumir worker se não especificado
        };
      }
      
      // Fallback: usar informações do node local
      const nodes = await this.discoverNodes();
      const localNode = nodes.find(n => n.status === 'ready') || nodes[0];
      
      return {
        id: localNode?.id || 'local',
        name: localNode?.name || 'Local Node',
        role: localNode?.role || 'manager'
      };
    } catch (error) {
      console.error(`Erro ao obter info do node para container ${containerId}:`, error);
      return {
        id: 'unknown',
        name: 'Unknown Node',
        role: 'unknown'
      };
    }
  }

  /**
   * Calcula percentual de CPU
   */
  calculateCpuPercent(stats) {
    try {
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuCount = stats.cpu_stats.online_cpus || 1;
      
      if (systemDelta > 0 && cpuDelta > 0) {
        return (cpuDelta / systemDelta) * cpuCount * 100;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calcula uso de memória
   */
  calculateMemoryUsage(stats) {
    try {
      const memoryUsage = stats.memory_stats.usage || 0;
      const memoryLimit = stats.memory_stats.limit || 0;
      const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;
      
      return {
        usage: memoryUsage,
        limit: memoryLimit,
        percent: memoryPercent,
        usageMB: Math.round(memoryUsage / (1024 * 1024) * 100) / 100
      };
    } catch (error) {
      return { usage: 0, limit: 0, percent: 0, usageMB: 0 };
    }
  }

  /**
   * Calcula estatísticas de rede
   */
  calculateNetworkStats(stats) {
    try {
      const networks = stats.networks || {};
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
      return { rxBytes: 0, txBytes: 0, rxBytesFormatted: '0 B', txBytesFormatted: '0 B' };
    }
  }

  /**
   * Calcula estatísticas de I/O
   */
  calculateBlockIOStats(stats) {
    try {
      const blkio = stats.blkio_stats || {};
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
      return { readBytes: 0, writeBytes: 0, readBytesFormatted: '0 B', writeBytesFormatted: '0 B' };
    }
  }

  /**
   * Formata bytes para unidades legíveis
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Obtém estatísticas do cluster
   */
  async getClusterStats() {
    try {
      const nodes = await this.discoverNodes();
      const containers = await this.getAllContainersFromCluster();
      
      const healthyNodes = nodes.filter(node => node.status === 'ready');
      const managerNodes = nodes.filter(node => node.role === 'manager');
      const workerNodes = nodes.filter(node => node.role === 'worker');
      
      const runningContainers = containers.filter(c => c.State === 'running');
      const stoppedContainers = containers.filter(c => c.State === 'exited' || c.State === 'dead');

      return {
        totalNodes: nodes.length,
        healthyNodes: healthyNodes.length,
        unhealthyNodes: nodes.length - healthyNodes.length,
        managerNodes: managerNodes.length,
        workerNodes: workerNodes.length,
        totalContainers: containers.length,
        runningContainers: runningContainers.length,
        stoppedContainers: stoppedContainers.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas do cluster:', error);
      return {
        totalNodes: 0,
        healthyNodes: 0,
        unhealthyNodes: 0,
        managerNodes: 0,
        workerNodes: 0,
        totalContainers: 0,
        runningContainers: 0,
        stoppedContainers: 0,
        lastUpdate: new Date().toISOString()
      };
    }
  }
}

module.exports = new ClusterService();
