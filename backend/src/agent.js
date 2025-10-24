#!/usr/bin/env node

/**
 * Agente DashDocker para nodes do Swarm
 * Roda em cada node para coletar dados locais
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');
const { calculateCpuPercent, calculateMemoryUsage } = require('./utils/statsCalculator');

const app = express();
const PORT = process.env.AGENT_PORT || 3002;

// Configuração do Docker
const docker = new Docker({
  socketPath: process.env.DOCKER_HOST || '/var/run/docker.sock'
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    node: process.env.HOSTNAME || 'unknown'
  });
});

// Listar containers locais
app.get('/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    
    const formattedContainers = containers.map(container => ({
      id: container.Id,
      name: container.Names[0]?.replace('/', '') || 'sem-nome',
      image: container.Image,
      status: container.State,
      ports: formatPorts(container.Ports),
      createdAt: container.Created,
      command: container.Command,
      labels: container.Labels || {}
    }));

    res.json({
      success: true,
      data: formattedContainers,
      count: formattedContainers.length,
      node: process.env.HOSTNAME || 'unknown'
    });
  } catch (error) {
    console.error('Erro ao listar containers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obter stats de containers locais
app.get('/stats', async (req, res) => {
  try {
    const containers = await docker.listContainers();
    const statsPromises = containers.map(async (container) => {
      try {
        const containerObj = docker.getContainer(container.Id);
        const stats = await containerObj.stats({ stream: false });
        
        return {
          containerId: container.Id,
          name: container.Names[0]?.replace('/', '') || 'sem-nome',
          status: container.State,
          cpu: {
            percent: calculateCpuPercent(stats),
            cores: stats.cpu_stats.online_cpus || 0
          },
          memory: calculateMemoryUsage(stats),
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error(`Erro ao obter stats do container ${container.Id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(statsPromises);
    const validStats = results.filter(stat => stat !== null);

    res.json({
      success: true,
      data: validStats,
      count: validStats.length,
      node: process.env.HOSTNAME || 'unknown'
    });
  } catch (error) {
    console.error('Erro ao obter stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obter logs de um container
app.get('/containers/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { tail = 100 } = req.query;
    
    const container = docker.getContainer(id);
    const logStream = await container.logs({
      follow: false,
      stdout: true,
      stderr: true,
      tail: parseInt(tail),
      timestamps: true
    });

    const logs = logStream.toString('utf8');
    
    res.json({
      success: true,
      data: {
        containerId: id,
        logs: logs,
        lines: logs.split('\n').length - 1,
        node: process.env.HOSTNAME || 'unknown'
      }
    });
  } catch (error) {
    console.error('Erro ao obter logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Informações do node
app.get('/node/info', async (req, res) => {
  try {
    const info = await docker.info();
    
    res.json({
      success: true,
      data: {
        id: info.ID,
        name: info.Name,
        containers: info.Containers,
        containersRunning: info.ContainersRunning,
        containersPaused: info.ContainersPaused,
        containersStopped: info.ContainersStopped,
        images: info.Images,
        driver: info.Driver,
        operatingSystem: info.OperatingSystem,
        architecture: info.Architecture,
        kernelVersion: info.KernelVersion,
        dockerVersion: info.ServerVersion,
        memory: info.MemTotal,
        cpu: info.NCPU,
        node: process.env.HOSTNAME || 'unknown'
      }
    });
  } catch (error) {
    console.error('Erro ao obter informações do node:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Função auxiliar para formatar portas
function formatPorts(ports) {
  if (!ports) return [];
  return ports.map(port => ({
    container: port.PrivatePort,
    host: port.PublicPort || 'N/A',
    protocol: port.Type || 'tcp',
    ip: port.IP || '0.0.0.0'
  }));
}

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 Agente DashDocker rodando na porta ${PORT}`);
  console.log(`📡 Node: ${process.env.HOSTNAME || 'unknown'}`);
  console.log(`🐳 Docker: ${process.env.DOCKER_HOST || '/var/run/docker.sock'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Agente recebeu SIGTERM, encerrando...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Agente recebeu SIGINT, encerrando...');
  process.exit(0);
});
