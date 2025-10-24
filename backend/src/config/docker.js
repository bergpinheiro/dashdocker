const Docker = require('dockerode');

// Configuração do Docker
const dockerConfig = {
  socketPath: process.env.DOCKER_HOST || '/var/run/docker.sock'
};

// Criar instância do Docker
const docker = new Docker(dockerConfig);

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

module.exports = {
  docker,
  testConnection
};
