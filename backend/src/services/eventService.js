const { docker } = require('../config/docker');
const notificationService = require('./notificationService');

/**
 * Serviço para monitoramento de eventos Docker
 */
class EventService {
  constructor() {
    this.eventStream = null;
    this.isMonitoring = false;
    this.notificationHistory = new Map(); // Histórico de notificações
    this.cooldownPeriods = {
      'start': 30000,      // 30 segundos para start
      'die': 60000,        // 1 minuto para die
      'kill': 30000,       // 30 segundos para kill
      'restart': 60000,    // 1 minuto para restart
      'oom': 300000,       // 5 minutos para oom
      'health_status: unhealthy': 300000 // 5 minutos para unhealthy
    };
  }

  /**
   * Inicia monitoramento de eventos Docker
   * @param {Function} callback - Callback para eventos
   */
  startMonitoring(callback) {
    if (this.isMonitoring) {
      console.log('Monitoramento de eventos já está ativo');
      return;
    }

    try {
      this.eventStream = docker.getEvents({
        since: Math.floor(Date.now() / 1000) - 60 // 1 minuto atrás
        // Removido 'until' para stream contínuo
      }, (err, stream) => {
        if (err) {
          console.error('Erro no stream de eventos:', err);
          this.isMonitoring = false;
          return;
        }

        this.isMonitoring = true;
        console.log('✅ Monitoramento de eventos Docker iniciado');

        stream.on('data', (data) => {
          try {
            const event = JSON.parse(data.toString());
            this.processEvent(event, callback);
          } catch (parseError) {
            console.error('Erro ao processar evento:', parseError);
          }
        });

        stream.on('error', (error) => {
          console.error('Erro no stream de eventos:', error);
          this.isMonitoring = false;
        });

        stream.on('end', () => {
          console.log('Stream de eventos finalizado');
          this.isMonitoring = false;
        });
      });
    } catch (error) {
      console.error('Erro ao iniciar monitoramento:', error);
      this.isMonitoring = false;
    }
  }

  /**
   * Para monitoramento de eventos
   */
  stopMonitoring() {
    if (this.eventStream) {
      this.eventStream.destroy();
      this.eventStream = null;
    }
    this.isMonitoring = false;
    console.log('❌ Monitoramento de eventos parado');
  }

  /**
   * Processa um evento Docker
   * @param {Object} event - Evento do Docker
   * @param {Function} callback - Callback para notificar frontend
   */
  async processEvent(event, callback) {
    try {
      const eventType = event.Type;
      const action = event.Action;
      const containerId = event.Actor?.ID;
      const containerName = event.Actor?.Attributes?.name;

      // Eventos que requerem notificação (mais seletivo)
      const notificationEvents = [
        'die',           // Container parou
        'health_status: unhealthy', // Container com problema de saúde
        'oom',           // Out of memory
        'kill'           // Container foi morto (apenas se não for restart)
      ];

      // Filtrar eventos de start/restart desnecessários
      const shouldNotify = this.shouldSendNotification(action, containerName, event);
      const isCritical = notificationEvents.includes(action) && shouldNotify;

      const eventData = {
        id: event.id,
        type: eventType,
        action: action,
        containerId: containerId,
        containerName: containerName,
        timestamp: new Date(event.time * 1000).toISOString(),
        isCritical: isCritical,
        attributes: event.Actor?.Attributes || {}
      };

      // Enviar evento para frontend via WebSocket
      if (callback) {
        callback('docker:event', eventData);
      }

      // Enviar notificação WhatsApp para eventos críticos
      if (isCritical) {
        await this.sendCriticalEventNotification(eventData);
      }

      console.log(`📡 Evento Docker: ${action} - ${containerName || containerId}`);
    } catch (error) {
      console.error('Erro ao processar evento:', error);
    }
  }

  /**
   * Verifica se deve enviar notificação baseado em cooldown e contexto
   * @param {string} action - Ação do evento
   * @param {string} containerName - Nome do container
   * @param {Object} event - Evento completo
   * @returns {boolean} Se deve enviar notificação
   */
  shouldSendNotification(action, containerName, event) {
    const now = Date.now();
    const key = `${containerName}_${action}`;
    
    // Verificar cooldown
    if (this.notificationHistory.has(key)) {
      const lastNotification = this.notificationHistory.get(key);
      const cooldown = this.cooldownPeriods[action] || 60000; // 1 minuto padrão
      
      if (now - lastNotification < cooldown) {
        console.log(`⏰ Cooldown ativo para ${containerName} ${action} (${Math.round((cooldown - (now - lastNotification)) / 1000)}s restantes)`);
        return false;
      }
    }
    
    // Filtrar eventos de restart desnecessários
    if (action === 'kill' && event.Actor?.Attributes?.exitCode === '0') {
      console.log(`🔄 Ignorando kill com exit code 0 (provavelmente restart): ${containerName}`);
      return false;
    }
    
    // Filtrar eventos de start após restart recente
    if (action === 'start') {
      const startKey = `${containerName}_die`;
      if (this.notificationHistory.has(startKey)) {
        const lastDie = this.notificationHistory.get(startKey);
        if (now - lastDie < 30000) { // 30 segundos
          console.log(`🔄 Ignorando start após die recente: ${containerName}`);
          return false;
        }
      }
    }
    
    // Atualizar histórico
    this.notificationHistory.set(key, now);
    
    // Limpar histórico antigo (mais de 1 hora)
    this.cleanupNotificationHistory();
    
    return true;
  }

  /**
   * Limpa histórico de notificações antigas
   */
  cleanupNotificationHistory() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hora
    
    for (const [key, timestamp] of this.notificationHistory.entries()) {
      if (now - timestamp > maxAge) {
        this.notificationHistory.delete(key);
      }
    }
  }

  /**
   * Envia notificação para eventos críticos
   * @param {Object} eventData - Dados do evento
   */
  async sendCriticalEventNotification(eventData) {
    try {
      const { action, containerName, containerId, timestamp } = eventData;
      
      let message = `🚨 *Alerta Docker*\n\n`;
      message += `*Container:* ${containerName || containerId}\n`;
      message += `*Ação:* ${action}\n`;
      message += `*Horário:* ${new Date(timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`;

      // Adicionar contexto específico baseado na ação
      switch (action) {
        case 'die':
          message += `⚠️ Container parou inesperadamente`;
          break;
        case 'start':
          message += `✅ Container iniciado`;
          break;
        case 'restart':
          message += `🔄 Container reiniciado`;
          break;
        case 'health_status: unhealthy':
          message += `🏥 Container com problema de saúde`;
          break;
        case 'oom':
          message += `💥 Container sem memória (OOM)`;
          break;
        case 'kill':
          message += `💀 Container foi morto`;
          break;
        default:
          message += `ℹ️ Evento: ${action}`;
      }

      // Enviar via WhatsApp
      await notificationService.sendNotification(message);
      
      console.log(`📱 Notificação enviada para: ${action} - ${containerName}`);
    } catch (error) {
      console.error('Erro ao enviar notificação crítica:', error);
    }
  }

  /**
   * Obtém status do monitoramento
   * @returns {Object} Status do monitoramento
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      hasStream: !!this.eventStream
    };
  }
}

module.exports = new EventService();
