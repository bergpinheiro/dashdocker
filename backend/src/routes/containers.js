const express = require('express');
const router = express.Router();
const dockerService = require('../services/dockerService');
const statsService = require('../services/statsService');

/**
 * GET /api/containers
 * Lista todos os containers
 */
router.get('/', async (req, res) => {
  try {
    const containers = await dockerService.getContainers();
    res.json({
      success: true,
      data: containers,
      count: containers.length
    });
  } catch (error) {
    console.error('Erro ao listar containers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/containers/:id
 * Obtém detalhes de um container específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const container = await dockerService.getContainerById(id);
    
    res.json({
      success: true,
      data: container
    });
  } catch (error) {
    console.error('Erro ao obter container:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Container não encontrado'
    });
  }
});

/**
 * GET /api/containers/:id/logs
 * Obtém logs de um container
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { tail = 100 } = req.query;
    
    const logs = await dockerService.getContainerLogs(id, parseInt(tail));
    
    res.json({
      success: true,
      data: {
        containerId: id,
        logs: logs,
        lines: logs.split('\n').length - 1
      }
    });
  } catch (error) {
    console.error('Erro ao obter logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao obter logs do container'
    });
  }
});

/**
 * GET /api/containers/stats
 * Obtém estatísticas de todos os containers
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await statsService.getAllContainersStats();
    res.json({
      success: true,
      data: stats,
      count: stats.length
    });
  } catch (error) {
    console.error('Erro ao obter stats dos containers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

module.exports = router;
