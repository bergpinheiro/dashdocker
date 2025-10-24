const { docker, getSwarmInfo, getSwarmNodes, isSwarmMode, getNodeInfo } = require('../config/docker');

/**
 * Serviço para monitoramento de Docker Swarm
 */
class SwarmService {
  constructor() {
    this.swarmMode = false;
    this.nodes = [];
    this.lastUpdate = 0;
    this.updateInterval = 30000; // 30 segundos
  }

  /**
   * Inicializa o serviço de Swarm
   */
  async initialize() {
    try {
      this.swarmMode = await isSwarmMode();
      
      if (this.swarmMode) {
        console.log('🐝 Modo Swarm detectado - monitorando todos os nodes');
        await this.updateNodesInfo();
      } else {
        console.log('🐳 Modo Docker standalone - monitorando apenas este node');
      }
      
      return this.swarmMode;
    } catch (error) {
      console.error('❌ Erro ao inicializar SwarmService:', error);
      return false;
    }
  }

  /**
   * Atualiza informações dos nodes
   */
  async updateNodesInfo() {
    try {
      const now = Date.now();
      
      // Atualizar apenas se passou o intervalo
      if (now - this.lastUpdate < this.updateInterval) {
        return this.nodes;
      }

      console.log('🔄 Atualizando informações dos nodes do Swarm...');
      
      const nodes = await getSwarmNodes();
      this.nodes = nodes.map(node => ({
        id: node.ID,
        name: node.Description?.Hostname || 'unknown',
        role: node.Spec?.Role || 'unknown',
        status: node.Status?.State || 'unknown',
        availability: node.Spec?.Availability || 'unknown',
        address: node.Status?.Addr || 'unknown',
        engineVersion: node.Description?.Engine?.EngineVersion || 'unknown',
        platform: node.Description?.Platform || {},
        resources: node.Description?.Resources || {},
        createdAt: node.CreatedAt,
        updatedAt: node.UpdatedAt
      }));

      this.lastUpdate = now;
      
      console.log(`✅ ${this.nodes.length} nodes encontrados no Swarm`);
      this.nodes.forEach(node => {
        console.log(`📋 Node: ${node.name} (${node.role}) - Status: ${node.status}`);
      });
      
      return this.nodes;
    } catch (error) {
      console.error('❌ Erro ao atualizar informações dos nodes:', error);
      return this.nodes;
    }
  }

  /**
   * Obtém informações do Swarm
   */
  async getSwarmInfo() {
    try {
      const swarm = await getSwarmInfo();
      if (!swarm) return null;

      return {
        id: swarm.ID,
        version: swarm.Version?.Index || 0,
        createdAt: swarm.CreatedAt,
        updatedAt: swarm.UpdatedAt,
        joinToken: swarm.JoinTokens?.Worker ? '***' : null,
        spec: swarm.Spec || {},
        clusterInfo: swarm.ClusterInfo || {}
      };
    } catch (error) {
      console.error('❌ Erro ao obter informações do Swarm:', error);
      return null;
    }
  }

  /**
   * Obtém lista de nodes
   */
  async getNodes() {
    if (!this.swarmMode) {
      return [{
        id: 'local',
        name: 'Local Node',
        role: 'manager',
        status: 'ready',
        availability: 'active',
        address: 'localhost',
        engineVersion: 'local',
        platform: {},
        resources: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }];
    }

    return await this.updateNodesInfo();
  }

  /**
   * Obtém estatísticas de todos os nodes
   */
  async getAllNodesStats() {
    try {
      const nodes = await this.getNodes();
      const statsPromises = nodes.map(async (node) => {
        try {
          // Para nodes remotos, não conseguimos obter stats diretamente
          // Mas podemos obter informações básicas
          return {
            nodeId: node.id,
            nodeName: node.name,
            role: node.role,
            status: node.status,
            availability: node.availability,
            address: node.address,
            engineVersion: node.engineVersion,
            resources: node.resources,
            lastSeen: new Date().toISOString()
          };
        } catch (error) {
          console.error(`❌ Erro ao obter stats do node ${node.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(statsPromises);
      return results.filter(stat => stat !== null);
    } catch (error) {
      console.error('❌ Erro ao obter stats de todos os nodes:', error);
      return [];
    }
  }

  /**
   * Verifica se um node está saudável
   */
  isNodeHealthy(node) {
    return node.status === 'ready' && node.availability === 'active';
  }

  /**
   * Obtém estatísticas gerais do Swarm
   */
  async getSwarmStats() {
    try {
      const nodes = await this.getNodes();
      const healthyNodes = nodes.filter(node => this.isNodeHealthy(node));
      const managerNodes = nodes.filter(node => node.role === 'manager');
      const workerNodes = nodes.filter(node => node.role === 'worker');

      return {
        totalNodes: nodes.length,
        healthyNodes: healthyNodes.length,
        unhealthyNodes: nodes.length - healthyNodes.length,
        managerNodes: managerNodes.length,
        workerNodes: workerNodes.length,
        swarmMode: this.swarmMode,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas do Swarm:', error);
      return {
        totalNodes: 0,
        healthyNodes: 0,
        unhealthyNodes: 0,
        managerNodes: 0,
        workerNodes: 0,
        swarmMode: false,
        lastUpdate: new Date().toISOString()
      };
    }
  }

  /**
   * Verifica alertas de nodes
   */
  async checkNodeAlerts() {
    try {
      const nodes = await this.getNodes();
      const alerts = [];

      for (const node of nodes) {
        if (!this.isNodeHealthy(node)) {
          alerts.push({
            type: 'node_unhealthy',
            nodeId: node.id,
            nodeName: node.name,
            status: node.status,
            availability: node.availability,
            message: `Node ${node.name} está com problemas: ${node.status}`
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error('❌ Erro ao verificar alertas de nodes:', error);
      return [];
    }
  }
}

module.exports = new SwarmService();
