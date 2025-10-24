const { docker } = require('../config/docker');
const { calculateUptime, getStatusColor } = require('../utils/statsCalculator');
const swarmService = require('./swarmService');
const agentService = require('./agentService');

/**
 * Serviço para interação com a API do Docker com cache
 */
class DockerService {
  constructor() {
    this.cache = {
      services: null,
      timestamp: 0,
      duration: 1000 // 1 segundo de cache (muito mais agressivo)
    };
    this.serviceCache = new Map(); // Cache para detalhes de serviços
  }
  
  /**
   * Lista todos os serviços Docker com cache
   * @returns {Promise<Array>} Lista de serviços
   */
  async getServices() {
    try {
      const now = Date.now();
      
      // Verificar cache
      if (this.cache.services && (now - this.cache.timestamp) < this.cache.duration) {
        console.log('📋 Retornando serviços do cache');
        return this.cache.services;
      }

      console.log('📋 Buscando serviços do Docker...');
      const services = await docker.listServices();
      
      const formattedServices = services.map(service => ({
        id: service.ID,
        name: service.Spec.Name,
        image: service.Spec.TaskTemplate.ContainerSpec.Image,
        replicas: service.Spec.Mode.Replicated ? service.Spec.Mode.Replicated.Replicas : 1,
        ports: this.extractPorts(service.Spec.EndpointSpec),
        env: this.extractEnvVars(service.Spec.TaskTemplate.ContainerSpec.Env),
        createdAt: service.CreatedAt,
        updatedAt: service.UpdatedAt,
        version: service.Version.Index
      }));

      // Atualizar cache
      this.cache.services = formattedServices;
      this.cache.timestamp = now;

      console.log(`✅ ${formattedServices.length} serviços encontrados`);
      return formattedServices;
    } catch (error) {
      console.error('Erro ao listar serviços:', error);
      throw new Error('Falha ao obter serviços Docker');
    }
  }

  /**
   * Obtém detalhes de um serviço específico com containers
   * @param {string} serviceId - ID do serviço
   * @returns {Promise<Object>} Detalhes do serviço
   */
  async getServiceById(serviceId) {
    try {
      const now = Date.now();
      const cacheKey = `service_${serviceId}`;
      
      // Verificar cache do serviço
      if (this.serviceCache.has(cacheKey)) {
        const cached = this.serviceCache.get(cacheKey);
        if ((now - cached.timestamp) < 2000) { // 2 segundos de cache
          console.log(`📋 Retornando serviço ${serviceId} do cache`);
          return cached.data;
        }
      }

      console.log(`📋 Buscando detalhes do serviço: ${serviceId}`);
      const service = await docker.getService(serviceId).inspect();
      
      // Buscar containers relacionados ao serviço
      const containers = await this.getContainersByService(service.Spec.Name);
      
      const serviceData = {
        id: service.ID,
        name: service.Spec.Name,
        image: service.Spec.TaskTemplate.ContainerSpec.Image,
        replicas: service.Spec.Mode.Replicated ? service.Spec.Mode.Replicated.Replicas : 1,
        ports: this.extractPorts(service.Spec.EndpointSpec),
        env: this.extractEnvVars(service.Spec.TaskTemplate.ContainerSpec.Env),
        labels: service.Spec.Labels || {},
        createdAt: service.CreatedAt,
        updatedAt: service.UpdatedAt,
        version: service.Version.Index,
        containers: containers
      };

      // Atualizar cache
      this.serviceCache.set(cacheKey, {
        data: serviceData,
        timestamp: now
      });

      console.log(`✅ Serviço ${serviceId} carregado com ${containers.length} containers`);
      return serviceData;
    } catch (error) {
      console.error('Erro ao obter serviço:', error);
      throw new Error('Serviço não encontrado');
    }
  }

  /**
   * Busca containers relacionados a um serviço
   * @param {string} serviceName - Nome do serviço
   * @returns {Promise<Array>} Lista de containers
   */
  async getContainersByService(serviceName) {
    try {
      console.log(`🔍 Buscando containers para serviço: ${serviceName}`);
      const containers = await docker.listContainers({ all: true });
      
      console.log(`📦 Total de containers encontrados: ${containers.length}`);
      
      // Log de todos os containers para debug
      containers.forEach(container => {
        const containerName = container.Names[0]?.replace('/', '') || '';
        console.log(`📋 Container: ${containerName} | Status: ${container.State} | Image: ${container.Image}`);
      });
      
      const filteredContainers = containers.filter(container => {
        const containerName = container.Names[0]?.replace('/', '') || '';
        
        // Estratégia simples e eficaz
        const matches = 
          containerName.includes(serviceName) || 
          serviceName.includes(containerName) ||
          containerName.startsWith(serviceName) ||
          containerName.endsWith(serviceName) ||
          // Docker Swarm: service_name.task_id
          containerName.includes(`${serviceName}.`) ||
          // Docker Swarm: stack_service.task_id  
          containerName.includes(`_${serviceName}.`) ||
          containerName.includes(`-${serviceName}.`);
        
        if (matches) {
          console.log(`✅ Container encontrado: ${containerName} (Status: ${container.State}) para serviço: ${serviceName}`);
        }
        
        return matches;
      });
      
      console.log(`🎯 Containers filtrados para ${serviceName}: ${filteredContainers.length}`);
      
      // Se não encontrou nenhum container, mostrar todos para debug
      if (filteredContainers.length === 0) {
        console.log(`⚠️ Nenhum container encontrado para ${serviceName}. Todos os containers disponíveis:`);
        containers.forEach(container => {
          const containerName = container.Names[0]?.replace('/', '') || '';
          console.log(`📋 Disponível: ${containerName} | Status: ${container.State}`);
        });
      }
      
      // Log dos containers filtrados
      filteredContainers.forEach(container => {
        const containerName = container.Names[0]?.replace('/', '') || '';
        console.log(`📌 Filtrado: ${containerName} | Status: ${container.State}`);
      });
      
      return filteredContainers.map(container => ({
        id: container.Id,
        name: container.Names[0]?.replace('/', '') || 'sem-nome',
        image: container.Image,
        status: container.State,
        statusColor: getStatusColor(container.State),
        uptime: calculateUptime(container),
        ports: this.formatPorts(container.Ports),
        createdAt: container.Created,
        command: container.Command,
        labels: container.Labels || {},
        stoppedAt: container.State === 'exited' ? container.Status : null,
        stateFinishedAt: container.State === 'exited' ? container.Status : null
      }));
    } catch (error) {
      console.error('Erro ao buscar containers do serviço:', error);
      return [];
    }
  }

  /**
   * Lista todos os containers (usando agentes se disponível)
   * @returns {Promise<Array>} Lista de containers
   */
  async getContainers() {
    try {
      // Tentar usar agentes primeiro
      if (await swarmService.isSwarmMode()) {
        console.log('🐝 Modo Swarm detectado, tentando usar agentes...');
        const agentContainers = await agentService.getAllContainersFromAgents();
        
        if (agentContainers.length > 0) {
          console.log(`✅ ${agentContainers.length} containers obtidos via agentes`);
          return agentContainers.map(container => ({
            id: container.id,
            name: container.name,
            image: container.image,
            status: container.status,
            statusColor: getStatusColor(container.status),
            uptime: calculateUptime(container),
            ports: this.formatPorts(container.ports),
            createdAt: container.createdAt,
            command: container.command,
            labels: container.labels || {},
            nodeId: container.nodeId,
            nodeName: container.nodeName
          }));
        }
      }

      // Fallback: usar API local
      console.log('⚠️ Usando API local como fallback');
      const containers = await docker.listContainers({ all: true });
      
      return containers.map(container => ({
        id: container.Id,
        name: container.Names[0]?.replace('/', '') || 'sem-nome',
        image: container.Image,
        status: container.State,
        statusColor: getStatusColor(container.State),
        uptime: calculateUptime(container),
        ports: this.formatPorts(container.Ports),
        createdAt: container.Created,
        command: container.Command,
        labels: container.Labels || {},
        nodeId: 'local',
        nodeName: 'Local Node'
      }));
    } catch (error) {
      console.error('Erro ao listar containers:', error);
      throw new Error('Falha ao obter containers Docker');
    }
  }

  /**
   * Obtém detalhes de um container específico
   * @param {string} containerId - ID do container
   * @returns {Promise<Object>} Detalhes do container
   */
  async getContainerById(containerId) {
    try {
      const container = docker.getContainer(containerId);
      const inspect = await container.inspect();
      
      return {
        id: inspect.Id,
        name: inspect.Name.replace('/', ''),
        image: inspect.Config.Image,
        status: inspect.State.Status,
        statusColor: getStatusColor(inspect.State.Status),
        uptime: calculateUptime(inspect),
        ports: this.formatPorts(inspect.NetworkSettings.Ports),
        env: inspect.Config.Env || [],
        labels: inspect.Config.Labels || {},
        createdAt: inspect.Created,
        startedAt: inspect.State.StartedAt,
        finishedAt: inspect.State.FinishedAt,
        restartCount: inspect.RestartCount,
        command: inspect.Config.Cmd,
        workingDir: inspect.Config.WorkingDir,
        user: inspect.Config.User,
        mounts: inspect.Mounts || []
      };
    } catch (error) {
      console.error('Erro ao obter container:', error);
      throw new Error('Container não encontrado');
    }
  }

  /**
   * Obtém logs de um container
   * @param {string} containerId - ID do container
   * @param {number} tail - Número de linhas (padrão: 100)
   * @returns {Promise<string>} Logs do container
   */
  async getContainerLogs(containerId, tail = 100) {
    try {
      const container = docker.getContainer(containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: tail,
        timestamps: true
      });
      
      return logs.toString();
    } catch (error) {
      console.error('Erro ao obter logs:', error);
      throw new Error('Falha ao obter logs do container');
    }
  }

  /**
   * Extrai portas de um serviço
   * @param {Object} endpointSpec - Especificação do endpoint
   * @returns {Array} Lista de portas
   */
  extractPorts(endpointSpec) {
    if (!endpointSpec || !endpointSpec.Ports) return [];
    
    return endpointSpec.Ports.map(port => ({
      published: port.PublishedPort,
      target: port.TargetPort,
      protocol: port.Protocol
    }));
  }

  /**
   * Extrai variáveis de ambiente
   * @param {Array} envVars - Array de variáveis de ambiente
   * @returns {Object} Objeto com variáveis de ambiente
   */
  extractEnvVars(envVars) {
    if (!envVars) return {};
    
    const env = {};
    envVars.forEach(envVar => {
      const [key, value] = envVar.split('=');
      env[key] = value;
    });
    
    return env;
  }

  /**
   * Formata portas de containers
   * @param {Object} ports - Portas do container
   * @returns {Array} Lista formatada de portas
   */
  formatPorts(ports) {
    if (!ports) return [];
    
    return Object.entries(ports).map(([containerPort, hostConfigs]) => {
      const hostConfig = hostConfigs?.[0];
      return {
        container: containerPort,
        host: hostConfig?.HostPort || 'N/A',
        protocol: hostConfig?.HostIp || 'tcp'
      };
    });
  }

  /**
   * Obtém informações do Swarm
   * @returns {Promise<Object>} Informações do Swarm
   */
  async getSwarmInfo() {
    try {
      return await swarmService.getSwarmInfo();
    } catch (error) {
      console.error('Erro ao obter informações do Swarm:', error);
      return null;
    }
  }

  /**
   * Obtém lista de nodes do Swarm
   * @returns {Promise<Array>} Lista de nodes
   */
  async getSwarmNodes() {
    try {
      return await swarmService.getNodes();
    } catch (error) {
      console.error('Erro ao obter nodes do Swarm:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas do Swarm
   * @returns {Promise<Object>} Estatísticas do Swarm
   */
  async getSwarmStats() {
    try {
      return await swarmService.getSwarmStats();
    } catch (error) {
      console.error('Erro ao obter estatísticas do Swarm:', error);
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
   * Verifica se está em modo Swarm
   * @returns {Promise<boolean>} True se estiver em modo Swarm
   */
  async isSwarmMode() {
    try {
      return await swarmService.initialize();
    } catch (error) {
      console.error('Erro ao verificar modo Swarm:', error);
      return false;
    }
  }
}

module.exports = new DockerService();
