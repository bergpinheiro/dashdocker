const { docker } = require('../config/docker');
const { calculateUptime, getStatusColor } = require('../utils/statsCalculator');

/**
 * Serviço para interação com a API do Docker
 */
class DockerService {
  
  /**
   * Lista todos os serviços Docker
   * @returns {Promise<Array>} Lista de serviços
   */
  async getServices() {
    try {
      const services = await docker.listServices();
      
      return services.map(service => ({
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
    } catch (error) {
      console.error('Erro ao listar serviços:', error);
      throw new Error('Falha ao obter serviços Docker');
    }
  }

  /**
   * Obtém detalhes de um serviço específico
   * @param {string} serviceId - ID do serviço
   * @returns {Promise<Object>} Detalhes do serviço
   */
  async getServiceById(serviceId) {
    try {
      const service = await docker.getService(serviceId).inspect();
      return {
        id: service.ID,
        name: service.Spec.Name,
        image: service.Spec.TaskTemplate.ContainerSpec.Image,
        replicas: service.Spec.Mode.Replicated ? service.Spec.Mode.Replicated.Replicas : 1,
        ports: this.extractPorts(service.Spec.EndpointSpec),
        env: this.extractEnvVars(service.Spec.TaskTemplate.ContainerSpec.Env),
        labels: service.Spec.Labels || {},
        createdAt: service.CreatedAt,
        updatedAt: service.UpdatedAt,
        version: service.Version.Index
      };
    } catch (error) {
      console.error('Erro ao obter serviço:', error);
      throw new Error('Serviço não encontrado');
    }
  }

  /**
   * Lista todos os containers
   * @returns {Promise<Array>} Lista de containers
   */
  async getContainers() {
    try {
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
        labels: container.Labels || {}
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
}

module.exports = new DockerService();
