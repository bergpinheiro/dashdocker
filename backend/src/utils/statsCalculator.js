/**
 * Utilitários para cálculo de estatísticas de CPU e memória
 */

/**
 * Calcula o percentual de uso de CPU
 * @param {Object} stats - Estatísticas do container
 * @returns {number} Percentual de CPU (0-100)
 */
const calculateCpuPercent = (stats) => {
  try {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                     stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - 
                        stats.precpu_stats.system_cpu_usage;
    
    if (systemDelta > 0 && cpuDelta > 0) {
      const cpuPercent = (cpuDelta / systemDelta) * 
                        stats.cpu_stats.online_cpus * 100;
      return Math.round(cpuPercent * 100) / 100; // Arredondar para 2 casas decimais
    }
    return 0;
  } catch (error) {
    console.error('Erro ao calcular CPU:', error);
    return 0;
  }
};

/**
 * Calcula o uso de memória em MB e percentual
 * @param {Object} stats - Estatísticas do container
 * @returns {Object} { usageMB, percent }
 */
const calculateMemoryUsage = (stats) => {
  try {
    const memUsage = stats.memory_stats.usage || 0;
    const memLimit = stats.memory_stats.limit || 0;
    
    const usageMB = Math.round(memUsage / 1024 / 1024 * 100) / 100;
    const percent = memLimit > 0 ? Math.round((memUsage / memLimit) * 100 * 100) / 100 : 0;
    
    return {
      usageMB,
      percent: Math.min(percent, 100) // Limitar a 100%
    };
  } catch (error) {
    console.error('Erro ao calcular memória:', error);
    return { usageMB: 0, percent: 0 };
  }
};

/**
 * Calcula o uptime do container
 * @param {Object} container - Objeto do container
 * @returns {string} Uptime formatado (ex: "2d 3h 45m")
 */
const calculateUptime = (container) => {
  try {
    const startedAt = new Date(container.State.StartedAt);
    const now = new Date();
    const diffMs = now - startedAt;
    
    if (diffMs < 0) return '0s';
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && days === 0) parts.push(`${seconds}s`);
    
    return parts.length > 0 ? parts.join(' ') : '0s';
  } catch (error) {
    console.error('Erro ao calcular uptime:', error);
    return '0s';
  }
};

/**
 * Formata bytes para unidades legíveis
 * @param {number} bytes - Número de bytes
 * @returns {string} String formatada (ex: "1.5 GB")
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Determina a cor do status baseado no estado
 * @param {string} status - Status do container
 * @returns {string} Classe CSS para cor
 */
const getStatusColor = (status) => {
  const statusMap = {
    'running': 'text-green-500',
    'exited': 'text-red-500',
    'restarting': 'text-yellow-500',
    'paused': 'text-gray-500',
    'unhealthy': 'text-orange-500',
    'created': 'text-blue-500',
    'dead': 'text-red-600'
  };
  
  return statusMap[status] || 'text-gray-400';
};

module.exports = {
  calculateCpuPercent,
  calculateMemoryUsage,
  calculateUptime,
  formatBytes,
  getStatusColor
};
