const { docker } = require('../config/docker');
const notificationService = require('./notificationService');

/**
 * Serviço para monitoramento de eventos Docker
 */
class EventService {
  constructor() {
    this.eventStream = null;
    this.isMonitoring = false;
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
        since: Math.floor(Date.now() / 1000),
        until: 0
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

      // Eventos críticos que requerem notificação
      const criticalEvents = [
        'die',           // Container parou
        'start',         // Container iniciou
        'restart',       // Container reiniciou
        'health_status: unhealthy', // Container com problema de saúde
        'oom',           // Out of memory
        'kill'           // Container foi morto
      ];

      const isCritical = criticalEvents.includes(action);

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
   * Envia notificação para eventos críticos
   * @param {Object} eventData - Dados do evento
   */
  async sendCriticalEventNotification(eventData) {
    try {
      const { action, containerName, containerId, timestamp } = eventData;
      
      let message = `🚨 *Alerta Docker*\n\n`;
      message += `*Container:* ${containerName || containerId}\n`;
      message += `*Ação:* ${action}\n`;
      message += `*Horário:* ${new Date(timestamp).toLocaleString('pt-BR')}\n\n`;

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
