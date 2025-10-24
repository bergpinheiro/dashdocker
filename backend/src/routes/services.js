const express = require('express');
const router = express.Router();
const dockerService = require('../services/dockerService');

/**
 * GET /api/services
 * Lista todos os serviços Docker
 */
router.get('/', async (req, res) => {
  try {
    console.log('📋 Listando serviços Docker...');
    const services = await dockerService.getServices();
    console.log(`✅ ${services.length} serviços encontrados`);
    res.json({
      success: true,
      data: services,
      count: services.length
    });
  } catch (error) {
    console.error('❌ Erro ao listar serviços:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/services/:id
 * Obtém detalhes de um serviço específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await dockerService.getServiceById(id);
    
    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Erro ao obter serviço:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Serviço não encontrado'
    });
  }
});

module.exports = router;
