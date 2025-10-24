/**
 * Utilitários para formatação de dados
 */

/**
 * Formata bytes para unidades legíveis
 * @param {number} bytes - Número de bytes
 * @returns {string} String formatada (ex: "1.5 GB")
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Formata percentual
 * @param {number} value - Valor numérico
 * @param {number} decimals - Número de casas decimais
 * @returns {string} Percentual formatado
 */
export const formatPercent = (value, decimals = 1) => {
  if (isNaN(value) || value === null || value === undefined) return '0%';
  return `${Number(value || 0).toFixed(decimals)}%`;
};

/**
 * Formata timestamp para data/hora legível
 * @param {string|Date} timestamp - Timestamp ou data
 * @returns {string} Data formatada
 */
export const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Data inválida';
  
  return date.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
};

/**
 * Formata duração (uptime)
 * @param {string|Date} startTime - Tempo de início
 * @param {string|Date} endTime - Tempo de fim (opcional, usa agora se não informado)
 * @returns {string} Duração formatada
 */
export const formatDuration = (startTime, endTime = null) => {
  if (!startTime) return '0s';
  
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  
  if (isNaN(start.getTime())) return '0s';
  
  const diffMs = end - start;
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
};

/**
 * Formata status do container para exibição
 * @param {string} status - Status do container
 * @returns {Object} Objeto com status formatado e cor
 */
export const formatContainerStatus = (status) => {
  const statusMap = {
    'running': {
      label: 'Executando',
      color: 'success',
      icon: 'play-circle',
    },
    'exited': {
      label: 'Parado',
      color: 'danger',
      icon: 'stop-circle',
    },
    'restarting': {
      label: 'Reiniciando',
      color: 'warning',
      icon: 'refresh-cw',
    },
    'paused': {
      label: 'Pausado',
      color: 'gray',
      icon: 'pause-circle',
    },
    'unhealthy': {
      label: 'Não saudável',
      color: 'warning',
      icon: 'alert-triangle',
    },
    'created': {
      label: 'Criado',
      color: 'primary',
      icon: 'plus-circle',
    },
    'dead': {
      label: 'Morto',
      color: 'danger',
      icon: 'x-circle',
    },
  };
  
  return statusMap[status] || {
    label: status || 'Desconhecido',
    color: 'gray',
    icon: 'help-circle',
  };
};

/**
 * Formata portas para exibição
 * @param {Array} ports - Array de portas
 * @returns {string} Portas formatadas
 */
export const formatPorts = (ports) => {
  if (!ports || !Array.isArray(ports) || ports.length === 0) {
    return 'Nenhuma porta exposta';
  }
  
  return ports.map(port => {
    if (port.host && port.host !== 'N/A') {
      return `${port.host}:${port.container}`;
    }
    return port.container;
  }).join(', ');
};

/**
 * Formata variáveis de ambiente para exibição
 * @param {Object} envVars - Objeto com variáveis de ambiente
 * @returns {Array} Array de variáveis formatadas
 */
export const formatEnvVars = (envVars) => {
  if (!envVars || typeof envVars !== 'object') return [];
  
  return Object.entries(envVars).map(([key, value]) => ({
    key,
    value: value || '',
    display: `${key}=${value || ''}`,
  }));
};

/**
 * Trunca texto com reticências
 * @param {string} text - Texto para truncar
 * @param {number} maxLength - Comprimento máximo
 * @returns {string} Texto truncado
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Formata número com separadores de milhares
 * @param {number} number - Número para formatar
 * @returns {string} Número formatado
 */
export const formatNumber = (number) => {
  if (isNaN(number) || number === null || number === undefined) return '0';
  return Number(number).toLocaleString('pt-BR');
};

/**
 * Formata CPU cores
 * @param {number} cores - Número de cores
 * @returns {string} Cores formatados
 */
export const formatCpuCores = (cores) => {
  if (!cores || cores === 0) return 'N/A';
  return cores === 1 ? '1 core' : `${cores} cores`;
};

/**
 * Formata labels do Docker
 * @param {Object} labels - Objeto com labels
 * @returns {Array} Array de labels formatadas
 */
export const formatLabels = (labels) => {
  if (!labels || typeof labels !== 'object') return [];
  
  return Object.entries(labels).map(([key, value]) => ({
    key,
    value,
    display: `${key}: ${value}`,
  }));
};
