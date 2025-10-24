const express = require('express');
const router = express.Router();
const clusterService = require('../services/clusterService');

/**
 * GET /api/cluster/nodes
 * Lista todos os nodes do cluster
 */
router.get('/nodes', async (req, res) => {
  try {
    const nodes = await clusterService.discoverNodes();
    res.json({
      success: true,
      data: nodes,
      count: nodes.length
    });
  } catch (error) {
    console.error('Erro ao listar nodes do cluster:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/cluster/stats
 * Obtém estatísticas gerais do cluster
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await clusterService.getClusterStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do cluster:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/cluster/containers
 * Lista todos os containers do cluster
 */
router.get('/containers', async (req, res) => {
  try {
    const containers = await clusterService.getAllContainersFromCluster();
    res.json({
      success: true,
      data: containers,
      count: containers.length
    });
  } catch (error) {
    console.error('Erro ao listar containers do cluster:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

module.exports = router;
