const notificationService = require('./notificationService');

/**
 * Serviço para monitoramento de alertas de recursos
 */
class AlertService {
  constructor() {
    this.thresholds = {
      cpu: {
        warning: 70,    // 70% CPU = aviso
        critical: 90    // 90% CPU = crítico
      },
      memory: {
        warning: 80,    // 80% memória = aviso
        critical: 95    // 95% memória = crítico
      }
    };
    
    this.alertHistory = new Map(); // Histórico de alertas para evitar spam
    this.alertCooldowns = {
      resource: 300000,    // 5 minutos para alertas de recursos
      health: 600000,      // 10 minutos para alertas de saúde
      stopped: 7200000     // 2 horas para containers parados
    };
  }

  /**
   * Verifica se um container excedeu os limites de recursos
   * @param {Object} containerStats - Estatísticas do container
   * @param {Object} containerInfo - Informações do container
   */
  checkResourceAlerts(containerStats, containerInfo) {
    const { containerId, name, nodeName } = containerInfo;
    const { cpu, memory } = containerStats;
    
    // Verificar CPU
    if (cpu.percent > this.thresholds.cpu.critical) {
      this.sendResourceAlert('critical', 'cpu', containerId, name, cpu.percent, this.thresholds.cpu.critical, nodeName);
    } else if (cpu.percent > this.thresholds.cpu.warning) {
      this.sendResourceAlert('warning', 'cpu', containerId, name, cpu.percent, this.thresholds.cpu.warning, nodeName);
    }
    
    // Verificar Memória
    if (memory.percent > this.thresholds.memory.critical) {
      this.sendResourceAlert('critical', 'memory', containerId, name, memory.percent, this.thresholds.memory.critical, nodeName);
    } else if (memory.percent > this.thresholds.memory.warning) {
      this.sendResourceAlert('warning', 'memory', containerId, name, memory.percent, this.thresholds.memory.warning, nodeName);
    }
  }

  /**
   * Envia alerta de recurso
   * @param {string} level - Nível do alerta (warning/critical)
   * @param {string} resource - Recurso (cpu/memory)
   * @param {string} containerId - ID do container
   * @param {string} containerName - Nome do container
   * @param {number} currentValue - Valor atual
   * @param {number} threshold - Limite configurado
   */
  async sendResourceAlert(level, resource, containerId, containerName, currentValue, threshold, nodeName = null) {
    const alertKey = `${containerId}_${resource}_${level}`;
    const now = Date.now();
    const cooldown = this.alertCooldowns.resource;
    
    // Verificar cooldown
    if (this.alertHistory.has(alertKey)) {
      const lastAlert = this.alertHistory.get(alertKey);
      if (now - lastAlert < cooldown) {
        console.log(`⏰ Cooldown ativo para alerta de ${resource} (${Math.round((cooldown - (now - lastAlert)) / 1000)}s restantes)`);
        return; // Ainda em cooldown
      }
    }
    
    // Atualizar histórico
    this.alertHistory.set(alertKey, now);
    
    const emoji = level === 'critical' ? '🚨' : '⚠️';
    const resourceName = resource === 'cpu' ? 'CPU' : 'Memória';
    const resourceUnit = resource === 'cpu' ? '%' : '%';
    
    let message = `${emoji} *Alerta de ${resourceName}*\n\n`;
    message += `*Container:* ${containerName}\n`;
    message += `*Node:* ${nodeName || 'Desconhecido'}\n`;
    message += `*Recurso:* ${resourceName}\n`;
    message += `*Uso Atual:* ${currentValue.toFixed(1)}${resourceUnit}\n`;
    message += `*Limite:* ${threshold}${resourceUnit}\n`;
    message += `*Nível:* ${level === 'critical' ? 'CRÍTICO' : 'AVISO'}\n`;
    message += `*Horário:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;
    
    if (level === 'critical') {
      message += `🔥 *AÇÃO NECESSÁRIA:* Container pode falhar!\n`;
      message += `• Verificar logs do container\n`;
      message += `• Considerar aumentar recursos\n`;
      message += `• Verificar vazamentos de memória`;
    } else {
      message += `📊 *Monitoramento:* Container próximo do limite\n`;
      message += `• Acompanhar uso de recursos\n`;
      message += `• Verificar se é uso normal`;
    }
    
    try {
      await notificationService.sendNotification(message);
      console.log(`📱 Alerta de ${resource} enviado: ${containerName} (${currentValue.toFixed(1)}%)`);
    } catch (error) {
      console.error('Erro ao enviar alerta de recurso:', error);
    }
  }

  /**
   * Verifica saúde dos containers
   * @param {Array} containers - Lista de containers
   */
  async checkContainerHealth(containers) {
    for (const container of containers) {
      if (container.status === 'running' && container.health) {
        if (container.health === 'unhealthy') {
          await this.sendHealthAlert(container);
        }
      }
    }
  }

  /**
   * Envia alerta de saúde do container
   * @param {Object} container - Informações do container
   */
  async sendHealthAlert(container) {
    const alertKey = `${container.id}_health`;
    const now = Date.now();
    const cooldown = this.alertCooldowns.health;
    
    // Verificar cooldown
    if (this.alertHistory.has(alertKey)) {
      const lastAlert = this.alertHistory.get(alertKey);
      if (now - lastAlert < cooldown) {
        console.log(`⏰ Cooldown ativo para alerta de saúde (${Math.round((cooldown - (now - lastAlert)) / 1000)}s restantes)`);
        return;
      }
    }
    
    this.alertHistory.set(alertKey, now);
    
    let message = `🏥 *Alerta de Saúde do Container*\n\n`;
    message += `*Container:* ${container.name}\n`;
    message += `*Status:* ${container.status}\n`;
    message += `*Saúde:* INSAUDÁVEL ❌\n`;
    message += `*Imagem:* ${container.image}\n`;
    message += `*Horário:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;
    message += `🔍 *AÇÕES RECOMENDADAS:*\n`;
    message += `• Verificar logs do container\n`;
    message += `• Verificar health checks\n`;
    message += `• Reiniciar container se necessário\n`;
    message += `• Verificar dependências`;
    
    try {
      await notificationService.sendNotification(message);
      console.log(`📱 Alerta de saúde enviado: ${container.name}`);
    } catch (error) {
      console.error('Erro ao enviar alerta de saúde:', error);
    }
  }

  /**
   * Verifica containers parados há muito tempo
   * @param {Array} containers - Lista de containers
   */
  async checkStoppedContainers(containers) {
    const stoppedContainers = containers.filter(c => 
      c.status === 'exited' || c.status === 'dead'
    );
    
    for (const container of stoppedContainers) {
      let stoppedTime;
      
      // Tentar extrair tempo do status do container
      if (container.stoppedAt) {
        const statusMatch = container.stoppedAt.match(/(\d+) seconds ago/);
        if (statusMatch) {
          const secondsAgo = parseInt(statusMatch[1]);
          stoppedTime = new Date(Date.now() - (secondsAgo * 1000));
          console.log(`🕐 Container ${container.name}: parado há ${secondsAgo} segundos (calculado do status)`);
        } else {
          // Se não conseguir extrair do status, usar createdAt
          stoppedTime = new Date(container.createdAt * 1000); // Converter timestamp Unix para Date
          console.log(`🕐 Container ${container.name}: usando createdAt como fallback`);
        }
      } else {
        // Usar createdAt como fallback (converter timestamp Unix)
        stoppedTime = new Date(container.createdAt * 1000);
        console.log(`🕐 Container ${container.name}: usando createdAt como fallback (sem stoppedAt)`);
      }
      
      const now = new Date();
      const hoursStopped = (now - stoppedTime) / (1000 * 60 * 60);
      
      console.log(`🕐 Container ${container.name}: parado há ${hoursStopped.toFixed(2)} horas`);
      console.log(`🕐 Detalhes: stoppedAt="${container.stoppedAt}", createdAt="${container.createdAt}"`);
      
      // Alertar se parado há mais de 1 hora
      if (hoursStopped > 1) {
        await this.sendStoppedContainerAlert(container, hoursStopped);
      }
    }
  }

  /**
   * Envia alerta de container parado
   * @param {Object} container - Container parado
   * @param {number} hoursStopped - Horas parado
   */
  async sendStoppedContainerAlert(container, hoursStopped) {
    const alertKey = `${container.id}_stopped`;
    const now = Date.now();
    const cooldown = this.alertCooldowns.stopped;
    
    // Verificar cooldown
    if (this.alertHistory.has(alertKey)) {
      const lastAlert = this.alertHistory.get(alertKey);
      if (now - lastAlert < cooldown) {
        console.log(`⏰ Cooldown ativo para container parado (${Math.round((cooldown - (now - lastAlert)) / 1000 / 60)}min restantes)`);
        return;
      }
    }
    
    this.alertHistory.set(alertKey, now);
    
    let message = `⏹️ *Container Parado há Muito Tempo*\n\n`;
    message += `*Container:* ${container.name}\n`;
    message += `*Status:* ${container.status}\n`;
    message += `*Node:* ${container.nodeName || container.nodeId || 'Desconhecido'}\n`;
    message += `*Tempo Parado:* ${hoursStopped.toFixed(1)} horas\n`;
    message += `*Imagem:* ${container.image}\n`;
    message += `*Horário:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;
    message += `🔧 *AÇÕES RECOMENDADAS:*\n`;
    message += `• Verificar se deve estar rodando\n`;
    message += `• Reiniciar se necessário\n`;
    message += `• Verificar logs para causa da parada`;
    
    try {
      await notificationService.sendNotification(message);
      console.log(`📱 Alerta de container parado enviado: ${container.name} (${hoursStopped.toFixed(1)}h)`);
    } catch (error) {
      console.error('Erro ao enviar alerta de container parado:', error);
    }
  }

  /**
   * Atualiza thresholds de alerta
   * @param {Object} newThresholds - Novos limites
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 Thresholds de alerta atualizados:', this.thresholds);
  }

  /**
   * Obtém thresholds atuais
   * @returns {Object} Thresholds configurados
   */
  getThresholds() {
    return this.thresholds;
  }

  /**
   * Limpa histórico de alertas antigos
   */
  cleanupAlertHistory() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    for (const [key, timestamp] of this.alertHistory.entries()) {
      if (now - timestamp > maxAge) {
        this.alertHistory.delete(key);
      }
    }
  }
}

module.exports = new AlertService();
