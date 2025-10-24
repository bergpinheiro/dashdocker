const express = require('express');
const router = express.Router();
const alertService = require('../services/alertService');

/**
 * GET /api/alerts/thresholds
 * Obter thresholds de alerta atuais
 */
router.get('/thresholds', (req, res) => {
  try {
    const thresholds = alertService.getThresholds();
    res.json({
      success: true,
      data: thresholds
    });
  } catch (error) {
    console.error('Erro ao obter thresholds:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * PUT /api/alerts/thresholds
 * Atualizar thresholds de alerta
 */
router.put('/thresholds', (req, res) => {
  try {
    const { cpu, memory } = req.body;
    
    // Validar dados
    if (cpu && (cpu.warning < 0 || cpu.warning > 100 || cpu.critical < 0 || cpu.critical > 100)) {
      return res.status(400).json({
        success: false,
        error: 'Thresholds de CPU devem estar entre 0 e 100'
      });
    }
    
    if (memory && (memory.warning < 0 || memory.warning > 100 || memory.critical < 0 || memory.critical > 100)) {
      return res.status(400).json({
        success: false,
        error: 'Thresholds de memória devem estar entre 0 e 100'
      });
    }
    
    if (cpu && cpu.warning >= cpu.critical) {
      return res.status(400).json({
        success: false,
        error: 'Threshold de aviso de CPU deve ser menor que o crítico'
      });
    }
    
    if (memory && memory.warning >= memory.critical) {
      return res.status(400).json({
        success: false,
        error: 'Threshold de aviso de memória deve ser menor que o crítico'
      });
    }
    
    // Atualizar thresholds
    alertService.updateThresholds({ cpu, memory });
    
    res.json({
      success: true,
      data: alertService.getThresholds(),
      message: 'Thresholds atualizados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar thresholds:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/alerts/test
 * Enviar alerta de teste
 */
router.post('/test', async (req, res) => {
  try {
    const { type = 'resource' } = req.body;
    
    let message = '';
    
    switch (type) {
      case 'resource':
        message = `🧪 *Teste de Alerta de Recurso*\n\n`;
        message += `*Container:* container-teste\n`;
        message += `*Recurso:* CPU\n`;
        message += `*Uso Atual:* 85.5%\n`;
        message += `*Limite:* 70%\n`;
        message += `*Nível:* AVISO\n`;
        message += `*Horário:* ${new Date().toLocaleString('pt-BR')}\n\n`;
        message += `📊 *Monitoramento:* Container próximo do limite\n`;
        message += `• Acompanhar uso de recursos\n`;
        message += `• Verificar se é uso normal`;
        break;
        
      case 'health':
        message = `🧪 *Teste de Alerta de Saúde*\n\n`;
        message += `*Container:* container-teste\n`;
        message += `*Status:* running\n`;
        message += `*Saúde:* INSAUDÁVEL ❌\n`;
        message += `*Imagem:* nginx:latest\n`;
        message += `*Horário:* ${new Date().toLocaleString('pt-BR')}\n\n`;
        message += `🔍 *AÇÕES RECOMENDADAS:*\n`;
        message += `• Verificar logs do container\n`;
        message += `• Verificar health checks\n`;
        message += `• Reiniciar container se necessário`;
        break;
        
      case 'stopped':
        message = `🧪 *Teste de Container Parado*\n\n`;
        message += `*Container:* container-teste\n`;
        message += `*Status:* exited\n`;
        message += `*Tempo Parado:* 2.5 horas\n`;
        message += `*Imagem:* nginx:latest\n`;
        message += `*Horário:* ${new Date().toLocaleString('pt-BR')}\n\n`;
        message += `🔧 *AÇÕES RECOMENDADAS:*\n`;
        message += `• Verificar se deve estar rodando\n`;
        message += `• Reiniciar se necessário`;
        break;
        
      default:
        message = `🧪 *Teste de Notificação*\n\n`;
        message += `*Tipo:* ${type}\n`;
        message += `*Horário:* ${new Date().toLocaleString('pt-BR')}\n\n`;
        message += `✅ Sistema de notificações funcionando!`;
    }
    
    await notificationService.sendNotification(message);
    
    res.json({
      success: true,
      message: `Alerta de teste (${type}) enviado com sucesso`
    });
  } catch (error) {
    console.error('Erro ao enviar alerta de teste:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao enviar alerta de teste'
    });
  }
});

/**
 * GET /api/alerts/status
 * Obter status do sistema de alertas
 */
router.get('/status', (req, res) => {
  try {
    const thresholds = alertService.getThresholds();
    
    res.json({
      success: true,
      data: {
        thresholds,
        features: {
          resourceAlerts: true,
          healthAlerts: true,
          stoppedContainerAlerts: true,
          cooldownPeriod: '5 minutos',
          cleanupInterval: '24 horas'
        },
        supportedEvents: [
          'die', 'start', 'restart', 'kill',
          'health_status: unhealthy', 'oom',
          'cpu_warning', 'cpu_critical',
          'memory_warning', 'memory_critical',
          'container_stopped_long_time'
        ]
      }
    });
  } catch (error) {
    console.error('Erro ao obter status dos alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
