const express = require('express');
const router = express.Router();
const dockerService = require('../services/dockerService');

/**
 * GET /api/swarm/info
 * Obtém informações do Swarm
 */
router.get('/info', async (req, res) => {
  try {
    const swarmInfo = await dockerService.getSwarmInfo();
    
    if (!swarmInfo) {
      return res.json({
        success: true,
        data: {
          swarmMode: false,
          message: 'Não está em modo Swarm'
        }
      });
    }
    
    res.json({
      success: true,
      data: swarmInfo
    });
  } catch (error) {
    console.error('Erro ao obter informações do Swarm:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/swarm/nodes
 * Lista todos os nodes do Swarm
 */
router.get('/nodes', async (req, res) => {
  try {
    const nodes = await dockerService.getSwarmNodes();
    
    res.json({
      success: true,
      data: nodes,
      count: nodes.length
    });
  } catch (error) {
    console.error('Erro ao listar nodes do Swarm:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/swarm/stats
 * Obtém estatísticas do Swarm
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await dockerService.getSwarmStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do Swarm:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/swarm/status
 * Verifica se está em modo Swarm
 */
router.get('/status', async (req, res) => {
  try {
    const isSwarmMode = await dockerService.isSwarmMode();
    
    res.json({
      success: true,
      data: {
        swarmMode: isSwarmMode,
        message: isSwarmMode ? 'Modo Swarm ativo' : 'Modo Docker standalone'
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status do Swarm:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

module.exports = router;
