/**
 * Serviço de Agregação de Dados
 * Gerencia dados recebidos dos agents e fornece APIs para o frontend
 */

class AggregatorService {
  constructor() {
    // Armazenar dados de todos os nodes
    this.nodesData = new Map();
    this.lastCleanup = Date.now();
    this.cleanupInterval = 10000; // 10 segundos
    this.nodeTimeout = 30000; // 30 segundos
  }

  /**
   * Atualiza dados de um node
   */
  updateNodeData(nodeId, data) {
    const nodeData = {
      nodeId: nodeId,
      lastUpdate: data.timestamp,
      containers: data.containers || [],
      stats: data.stats || {},
      events: data.events || [],
      isOnline: true
    };

    this.nodesData.set(nodeId, nodeData);
    
    console.log(`📊 Dados atualizados do node ${nodeId}: ${nodeData.containers.length} containers`);
    
    // Executar limpeza se necessário
    this.cleanupIfNeeded();
  }

  /**
   * Obtém dados de todos os nodes
   */
  getAllNodesData() {
    const nodes = [];
    
    for (const [nodeId, data] of this.nodesData.entries()) {
      nodes.push({
        nodeId: nodeId,
        lastUpdate: data.lastUpdate,
        isOnline: data.isOnline,
        containerCount: data.containers.length,
        runningContainers: data.containers.filter(c => c.state === 'running').length
      });
    }
    
    return nodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  }

  /**
   * Obtém todos os containers de todos os nodes
   */
  getAllContainers() {
    const allContainers = [];
    
    for (const [nodeId, data] of this.nodesData.entries()) {
      for (const container of data.containers) {
        allContainers.push({
          ...container,
          nodeId: nodeId,
          nodeName: nodeId
        });
      }
    }
    
    return allContainers;
  }

  /**
   * Obtém stats agregados de todos os containers
   */
  getAllStats() {
    const allStats = {};
    
    for (const [nodeId, data] of this.nodesData.entries()) {
      for (const [containerId, stats] of Object.entries(data.stats)) {
        if (stats) {
          allStats[containerId] = {
            ...stats,
            nodeId: nodeId
          };
        }
      }
    }
    
    return allStats;
  }

  /**
   * Obtém dados de um node específico
   */
  getNodeData(nodeId) {
    return this.nodesData.get(nodeId) || null;
  }

  /**
   * Obtém containers de um node específico
   */
  getNodeContainers(nodeId) {
    const nodeData = this.nodesData.get(nodeId);
    return nodeData ? nodeData.containers : [];
  }

  /**
   * Obtém stats de um node específico
   */
  getNodeStats(nodeId) {
    const nodeData = this.nodesData.get(nodeId);
    return nodeData ? nodeData.stats : {};
  }

  /**
   * Obtém estatísticas agregadas do cluster
   */
  getClusterStats() {
    let totalContainers = 0;
    let runningContainers = 0;
    let totalNodes = this.nodesData.size;
    let onlineNodes = 0;
    let totalCpu = 0;
    let totalMemory = 0;

    for (const [nodeId, data] of this.nodesData.entries()) {
      if (data.isOnline) {
        onlineNodes++;
      }

      totalContainers += data.containers.length;
      runningContainers += data.containers.filter(c => c.state === 'running').length;

      // Calcular stats agregados
      for (const stats of Object.values(data.stats)) {
        if (stats) {
          totalCpu += stats.cpu?.percent || 0;
          totalMemory += stats.memory?.usage || 0;
        }
      }
    }

    return {
      totalNodes,
      onlineNodes,
      totalContainers,
      runningContainers,
      stoppedContainers: totalContainers - runningContainers,
      averageCpu: totalContainers > 0 ? totalCpu / totalContainers : 0,
      totalMemory: totalMemory
    };
  }

  /**
   * Obtém eventos recentes de todos os nodes
   */
  getAllRecentEvents() {
    const allEvents = [];
    const now = Date.now();
    const recentThreshold = 30000; // 30 segundos

    for (const [nodeId, data] of this.nodesData.entries()) {
      for (const event of data.events) {
        const eventTime = event.timeNano ? event.timeNano / 1000000 : event.time * 1000;
        
        if (now - eventTime <= recentThreshold) {
          allEvents.push({
            ...event,
            nodeId: nodeId
          });
        }
      }
    }

    return allEvents.sort((a, b) => {
      const timeA = a.timeNano ? a.timeNano : a.time * 1000000;
      const timeB = b.timeNano ? b.timeNano : b.time * 1000000;
      return timeB - timeA;
    });
  }

  /**
   * Limpa dados obsoletos
   */
  cleanupIfNeeded() {
    const now = Date.now();
    
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;
    const nodesToRemove = [];

    for (const [nodeId, data] of this.nodesData.entries()) {
      const timeSinceUpdate = now - data.lastUpdate;
      
      if (timeSinceUpdate > this.nodeTimeout) {
        if (data.isOnline) {
          console.log(`⚠️ Node ${nodeId} marcado como offline (${Math.round(timeSinceUpdate / 1000)}s sem dados)`);
          data.isOnline = false;
        } else if (timeSinceUpdate > this.nodeTimeout * 2) {
          // Remover node completamente após 2x o timeout
          nodesToRemove.push(nodeId);
        }
      }
    }

    // Remover nodes muito antigos
    for (const nodeId of nodesToRemove) {
      console.log(`🗑️ Removendo dados do node ${nodeId} (muito antigo)`);
      this.nodesData.delete(nodeId);
    }

    if (nodesToRemove.length > 0) {
      console.log(`🧹 Limpeza concluída: ${nodesToRemove.length} nodes removidos`);
    }
  }

  /**
   * Obtém resumo dos dados para debug
   */
  getDebugInfo() {
    const nodes = this.getAllNodesData();
    const containers = this.getAllContainers();
    const stats = this.getAllStats();
    const clusterStats = this.getClusterStats();

    return {
      nodes: nodes.length,
      containers: containers.length,
      stats: Object.keys(stats).length,
      cluster: clusterStats,
      lastCleanup: new Date(this.lastCleanup).toISOString()
    };
  }
}

// Exportar instância singleton
module.exports = new AggregatorService();
