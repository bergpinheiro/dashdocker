const axios = require('axios');

/**
 * Serviço para integração com API Waha (WhatsApp)
 */
class NotificationService {
  constructor() {
    this.wahaUrl = process.env.WAHA_URL;
    this.wahaToken = process.env.WAHA_TOKEN;
    this.wahaSession = process.env.WAHA_SESSION || 'default';
    this.wahaPhone = process.env.WAHA_PHONE;
    this.isConfigured = !!(this.wahaUrl && this.wahaToken && this.wahaPhone);
  }

  /**
   * Envia notificação via WhatsApp
   * @param {string} message - Mensagem a ser enviada
   * @param {string} phone - Número de telefone (opcional, usa o padrão se não informado)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendNotification(message, phone = null) {
    if (!this.isConfigured) {
      console.warn('⚠️ Waha API não configurada. Notificação não enviada.');
      return { success: false, error: 'Waha API não configurada' };
    }

    const targetPhone = phone || this.wahaPhone;
    const chatId = `${targetPhone}@c.us`;

    try {
      const response = await this.makeWahaRequest({
        session: this.wahaSession,
        chatId: chatId,
        text: message
      });

      console.log('✅ Notificação WhatsApp enviada com sucesso');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Erro ao enviar notificação WhatsApp:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envia notificação de teste
   * @returns {Promise<Object>} Resultado do teste
   */
  async sendTestNotification() {
    const testMessage = `🧪 *Teste DashDocker*\n\n` +
                       `Esta é uma mensagem de teste do sistema de monitoramento Docker.\n` +
                       `Horário: ${new Date().toLocaleString('pt-BR')}\n\n` +
                       `✅ Sistema funcionando corretamente!`;

    return await this.sendNotification(testMessage);
  }

  /**
   * Faz requisição para API Waha
   * @param {Object} data - Dados da requisição
   * @returns {Promise<Object>} Resposta da API
   */
  async makeWahaRequest(data) {
    const config = {
      method: 'POST',
      url: `${this.wahaUrl}/api/sendText`,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.wahaToken,
        'Accept': 'application/json'
      },
      data: data,
      timeout: 10000 // 10 segundos
    };

    return await axios(config);
  }

  /**
   * Verifica se a API Waha está disponível
   * @returns {Promise<Object>} Status da API
   */
  async checkWahaStatus() {
    if (!this.isConfigured) {
      return { available: false, error: 'API não configurada' };
    }

    try {
      const response = await axios.get(`${this.wahaUrl}/api/health`, {
        timeout: 5000,
        headers: {
          'X-Api-Key': this.wahaToken
        }
      });

      return { 
        available: true, 
        status: response.status,
        data: response.data 
      };
    } catch (error) {
      return { 
        available: false, 
        error: error.message,
        status: error.response?.status 
      };
    }
  }

  /**
   * Obtém configuração atual
   * @returns {Object} Configuração da notificação
   */
  getConfig() {
    return {
      isConfigured: this.isConfigured,
      wahaUrl: this.wahaUrl,
      wahaSession: this.wahaSession,
      wahaPhone: this.wahaPhone ? `${this.wahaPhone}@c.us` : null,
      hasToken: !!this.wahaToken
    };
  }

  /**
   * Envia notificação com retry
   * @param {string} message - Mensagem
   * @param {number} maxRetries - Máximo de tentativas
   * @param {number} delay - Delay entre tentativas (ms)
   * @returns {Promise<Object>} Resultado final
   */
  async sendNotificationWithRetry(message, maxRetries = 3, delay = 1000) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sendNotification(message);
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error.message;
      }

      if (attempt < maxRetries) {
        console.log(`Tentativa ${attempt} falhou, tentando novamente em ${delay}ms...`);
        await this.delay(delay);
        delay *= 2; // Exponential backoff
      }
    }

    console.error(`❌ Falha após ${maxRetries} tentativas:`, lastError);
    return { success: false, error: lastError, attempts: maxRetries };
  }

  /**
   * Delay helper
   * @param {number} ms - Milissegundos
   * @returns {Promise} Promise que resolve após o delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new NotificationService();
