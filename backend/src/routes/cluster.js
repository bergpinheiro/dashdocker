const express = require('express');
const router = express.Router();
const aggregatorService = require('../services/aggregatorService');

/**
 * GET /api/cluster/nodes
 * Lista todos os nodes do cluster
 */
router.get('/nodes', async (req, res) => {
  try {
    const nodes = aggregatorService.getAllNodesData();
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
    const stats = aggregatorService.getClusterStats();
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
    const containers = aggregatorService.getAllContainers();
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

/**
 * GET /api/cluster/node/:nodeId
 * Obtém dados de um node específico
 */
router.get('/node/:nodeId', async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    const nodeData = aggregatorService.getNodeData(nodeId);
    
    if (!nodeData) {
      return res.status(404).json({
        success: false,
        error: 'Node não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: nodeData
    });
  } catch (error) {
    console.error('Erro ao obter dados do node:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/cluster/events
 * Obtém eventos recentes de todos os nodes
 */
router.get('/events', async (req, res) => {
  try {
    const events = aggregatorService.getAllRecentEvents();
    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Erro ao obter eventos do cluster:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

module.exports = router;
