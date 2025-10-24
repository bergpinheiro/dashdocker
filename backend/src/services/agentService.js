const axios = require('axios');
const { docker } = require('../config/docker');

/**
 * Serviço para gerenciar agentes distribuídos no Swarm
 */
class AgentService {
  constructor() {
    this.agents = new Map(); // Cache de agentes
    this.agentConfig = {
      port: process.env.AGENT_PORT || 3002,
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 2000
    };
    this.lastDiscovery = 0;
    this.discoveryInterval = 60000; // 1 minuto
  }

  /**
   * Descobre agentes nos nodes do Swarm
   */
  async discoverAgents() {
    try {
      const now = Date.now();
      
      // Evitar descoberta muito frequente
      if (now - this.lastDiscovery < this.discoveryInterval) {
        return Array.from(this.agents.values());
      }

      console.log('🔍 Descobrindo agentes nos nodes do Swarm...');
      
      // Obter lista de nodes
      const nodes = await docker.listNodes();
      const agentPromises = nodes.map(node => this.checkNodeForAgent(node));
      
      const results = await Promise.all(agentPromises);
      const activeAgents = results.filter(agent => agent !== null);
      
      // Atualizar cache
      this.agents.clear();
      activeAgents.forEach(agent => {
        this.agents.set(agent.nodeId, agent);
      });
      
      this.lastDiscovery = now;
      
      console.log(`✅ ${activeAgents.length} agentes descobertos`);
      activeAgents.forEach(agent => {
        console.log(`📡 Agente: ${agent.nodeName} (${agent.address}) - Status: ${agent.status}`);
      });
      
      return activeAgents;
    } catch (error) {
      console.error('❌ Erro ao descobrir agentes:', error);
      return Array.from(this.agents.values());
    }
  }

  /**
   * Verifica se um node tem agente ativo
   */
  async checkNodeForAgent(node) {
    try {
      const nodeAddress = node.Status?.Addr;
      if (!nodeAddress) return null;

      // Tentar conectar no agente
      const agentUrl = `http://${nodeAddress}:${this.agentConfig.port}`;
      
      const response = await axios.get(`${agentUrl}/health`, {
        timeout: this.agentConfig.timeout
      });

      if (response.status === 200) {
        return {
          nodeId: node.ID,
          nodeName: node.Description?.Hostname || 'unknown',
          address: nodeAddress,
          agentUrl: agentUrl,
          status: 'active',
          lastSeen: new Date().toISOString(),
          version: response.data.version || 'unknown',
          uptime: response.data.uptime || 0
        };
      }
    } catch (error) {
      // Node não tem agente ou agente offline
      return null;
    }
  }

  /**
   * Obtém containers de um agente específico
   */
  async getContainersFromAgent(agent) {
    try {
      const response = await axios.get(`${agent.agentUrl}/containers`, {
        timeout: this.agentConfig.timeout
      });

      if (response.data.success) {
        return response.data.data.map(container => ({
          ...container,
          nodeId: agent.nodeId,
          nodeName: agent.nodeName,
          agentUrl: agent.agentUrl
        }));
      }
      return [];
    } catch (error) {
      console.error(`❌ Erro ao obter containers do agente ${agent.nodeName}:`, error.message);
      return [];
    }
  }

  /**
   * Obtém stats de um agente específico
   */
  async getStatsFromAgent(agent) {
    try {
      const response = await axios.get(`${agent.agentUrl}/stats`, {
        timeout: this.agentConfig.timeout
      });

      if (response.data.success) {
        return response.data.data.map(stat => ({
          ...stat,
          nodeId: agent.nodeId,
          nodeName: agent.nodeName,
          agentUrl: agent.agentUrl
        }));
      }
      return [];
    } catch (error) {
      console.error(`❌ Erro ao obter stats do agente ${agent.nodeName}:`, error.message);
      return [];
    }
  }

  /**
   * Obtém todos os containers de todos os agentes
   */
  async getAllContainersFromAgents() {
    try {
      const agents = await this.discoverAgents();
      
      if (agents.length === 0) {
        console.log('⚠️ Nenhum agente encontrado, usando dados locais');
        return await this.getLocalContainers();
      }

      const containerPromises = agents.map(agent => this.getContainersFromAgent(agent));
      const results = await Promise.all(containerPromises);
      
      return results.flat();
    } catch (error) {
      console.error('❌ Erro ao obter containers de todos os agentes:', error);
      return await this.getLocalContainers();
    }
  }

  /**
   * Obtém todos os stats de todos os agentes
   */
  async getAllStatsFromAgents() {
    try {
      const agents = await this.discoverAgents();
      
      if (agents.length === 0) {
        console.log('⚠️ Nenhum agente encontrado, usando stats locais');
        return await this.getLocalStats();
      }

      const statsPromises = agents.map(agent => this.getStatsFromAgent(agent));
      const results = await Promise.all(statsPromises);
      
      return results.flat();
    } catch (error) {
      console.error('❌ Erro ao obter stats de todos os agentes:', error);
      return await this.getLocalStats();
    }
  }

  /**
   * Fallback: obter containers locais
   */
  async getLocalContainers() {
    try {
      const containers = await docker.listContainers({ all: true });
      return containers.map(container => ({
        ...container,
        nodeId: 'local',
        nodeName: 'Local Node',
        agentUrl: 'local'
      }));
    } catch (error) {
      console.error('❌ Erro ao obter containers locais:', error);
      return [];
    }
  }

  /**
   * Fallback: obter stats locais
   */
  async getLocalStats() {
    try {
      const statsService = require('./statsService');
      return await statsService.getAllContainersStats();
    } catch (error) {
      console.error('❌ Erro ao obter stats locais:', error);
      return [];
    }
  }

  /**
   * Obtém informações de todos os agentes
   */
  async getAgentsInfo() {
    const agents = await this.discoverAgents();
    
    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      agents: agents,
      lastDiscovery: new Date(this.lastDiscovery).toISOString()
    };
  }

  /**
   * Verifica se há agentes ativos
   */
  hasActiveAgents() {
    return Array.from(this.agents.values()).some(agent => agent.status === 'active');
  }
}

module.exports = new AgentService();
