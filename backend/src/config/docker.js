const Docker = require('dockerode');

// Configuração do Docker
const dockerConfig = {
  socketPath: process.env.DOCKER_HOST || '/var/run/docker.sock'
};

// Criar instância do Docker
const docker = new Docker(dockerConfig);

// Cache para informações do Swarm
let swarmInfo = null;
let nodesInfo = null;

// Testar conexão
const testConnection = async () => {
  try {
    await docker.ping();
    console.log('✅ Conectado ao Docker Engine com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com Docker Engine:', error.message);
    return false;
  }
};

// Obter informações do Swarm
const getSwarmInfo = async () => {
  try {
    if (!swarmInfo) {
      swarmInfo = await docker.swarmInspect();
    }
    return swarmInfo;
  } catch (error) {
    console.error('❌ Erro ao obter informações do Swarm:', error.message);
    return null;
  }
};

// Obter lista de nodes do Swarm
const getSwarmNodes = async () => {
  try {
    if (!nodesInfo) {
      nodesInfo = await docker.listNodes();
    }
    return nodesInfo;
  } catch (error) {
    console.error('❌ Erro ao obter nodes do Swarm:', error.message);
    return [];
  }
};

// Verificar se estamos em um Swarm
const isSwarmMode = async () => {
  try {
    const swarm = await getSwarmInfo();
    return swarm !== null;
  } catch (error) {
    return false;
  }
};

// Obter informações detalhadas de um node
const getNodeInfo = async (nodeId) => {
  try {
    const node = await docker.getNode(nodeId).inspect();
    return node;
  } catch (error) {
    console.error(`❌ Erro ao obter informações do node ${nodeId}:`, error.message);
    return null;
  }
};

module.exports = {
  docker,
  testConnection,
  getSwarmInfo,
  getSwarmNodes,
  isSwarmMode,
  getNodeInfo
};
