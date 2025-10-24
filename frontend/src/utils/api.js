import axios from 'axios';

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.host);

// Criar instância do axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Adicionar token de autenticação se disponível
    const token = localStorage.getItem('dashdocker_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    
    // Tratar erros de autenticação
    if (error.response?.status === 401) {
      console.warn('🔒 Token inválido ou expirado');
      // Remover token inválido
      localStorage.removeItem('dashdocker_token');
      // Redirecionar para login se não estiver na página de login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      console.warn('🚫 Acesso negado');
    } else if (error.response?.status === 404) {
      console.warn('⚠️ Recurso não encontrado');
    } else if (error.response?.status >= 500) {
      console.error('🔥 Erro interno do servidor');
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏰ Timeout da requisição');
    } else if (!error.response) {
      console.error('🌐 Erro de rede - servidor não responde');
    }
    
    return Promise.reject(error);
  }
);

// Endpoints da API
export const apiEndpoints = {
  // Autenticação
  auth: {
    login: (credentials) => api.post('/api/auth/login', credentials),
    verify: (data) => api.post('/api/auth/verify', data),
    config: () => api.get('/api/auth/config'),
  },
  
  // Serviços
  services: {
    list: () => api.get('/api/services'),
    getById: (id) => api.get(`/api/services/${id}`),
  },
  
  // Cluster
  cluster: {
    nodes: () => api.get('/api/cluster/nodes'),
    containers: () => api.get('/api/cluster/containers'),
    stats: () => api.get('/api/cluster/stats'),
    node: (nodeId) => api.get(`/api/cluster/node/${nodeId}`),
    events: () => api.get('/api/cluster/events'),
  },
  
  // Containers
  containers: {
    list: () => api.get('/api/containers'),
    getById: (id) => api.get(`/api/containers/${id}`),
    getLogs: (id, tail = 100) => api.get(`/api/containers/${id}/logs?tail=${tail}`),
  },
  
  // Notificações
  notifications: {
    test: () => api.post('/api/notify/test'),
    send: (message, phone) => api.post('/api/notify/send', { message, phone }),
    status: () => api.get('/api/notify/status'),
    config: () => api.get('/api/notify/config'),
  },
  
  // Alertas
  alerts: {
    getThresholds: () => api.get('/api/alerts/thresholds'),
    updateThresholds: (data) => api.put('/api/alerts/thresholds', data),
    test: (data) => api.post('/api/alerts/test', data),
    getStatus: () => api.get('/api/alerts/status'),
  },
  
  // Health check
  health: () => api.get('/health'),
};

// Funções auxiliares para tratamento de erros
export const handleApiError = (error) => {
  if (error.response) {
    // Erro com resposta do servidor
    return {
      message: error.response.data?.error || error.response.data?.message || 'Erro do servidor',
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Erro de rede
    return {
      message: 'Erro de conexão com o servidor',
      status: 0,
      data: null,
    };
  } else {
    // Outros erros
    return {
      message: error.message || 'Erro desconhecido',
      status: 0,
      data: null,
    };
  }
};

// Função para verificar se a API está disponível
export const checkApiHealth = async () => {
  try {
    const response = await apiEndpoints.health();
    return {
      isHealthy: true,
      data: response.data,
    };
  } catch (error) {
    return {
      isHealthy: false,
      error: handleApiError(error),
    };
  }
};

export default api;
