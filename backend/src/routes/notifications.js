const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

/**
 * POST /api/notify/test
 * Envia notificação de teste via WhatsApp
 */
router.post('/test', async (req, res) => {
  try {
    const result = await notificationService.sendTestNotification();
    
    res.json({
      success: result.success,
      message: result.success ? 'Notificação de teste enviada' : 'Falha ao enviar notificação',
      data: result
    });
  } catch (error) {
    console.error('Erro ao enviar notificação de teste:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/notify/send
 * Envia notificação personalizada
 */
router.post('/send', async (req, res) => {
  try {
    const { message, phone } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Mensagem é obrigatória'
      });
    }

    const result = await notificationService.sendNotification(message, phone);
    
    res.json({
      success: result.success,
      message: result.success ? 'Notificação enviada' : 'Falha ao enviar notificação',
      data: result
    });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/notify/status
 * Verifica status da API Waha
 */
router.get('/status', async (req, res) => {
  try {
    const status = await notificationService.checkWahaStatus();
    const config = notificationService.getConfig();
    
    res.json({
      success: true,
      data: {
        status,
        config
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/notify/config
 * Obtém configuração atual das notificações
 */
router.get('/config', (req, res) => {
  try {
    const config = notificationService.getConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Erro ao obter configuração:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

module.exports = router;
