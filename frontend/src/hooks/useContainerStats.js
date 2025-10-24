import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { apiEndpoints } from '../utils/api';

/**
 * Hook para gerenciar estatísticas de containers em tempo real
 */
export const useContainerStats = () => {
  const [stats, setStats] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Carregar stats iniciais via HTTP
  const loadInitialStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiEndpoints.cluster.containers();
      if (response.data.success) {
        setStats(response.data.data);
        console.log('📊 Stats iniciais carregados:', response.data.data.length);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar stats iniciais:', error);
      setError('Falha ao carregar estatísticas iniciais');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const API_URL = import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.host);
    
    try {
      socketRef.current = io(API_URL, {
        transports: ['websocket', 'polling'],
        timeout: 5000, // Reduzido para 5s
        reconnection: true,
        reconnectionDelay: 500, // Reduzido para 500ms
        reconnectionAttempts: 10, // Aumentado para 10 tentativas
        maxReconnectionAttempts: 10,
        forceNew: true, // Força nova conexão
        upgrade: true, // Permite upgrade de polling para websocket
      });

      socketRef.current.on('connect', () => {
        setIsConnected(true);
        setError(null);
        
        // Limpar timeout de reconexão
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        setIsConnected(false);
        
        // Tentar reconectar após 5 segundos se não foi intencional
        if (reason !== 'io client disconnect') {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSocket();
          }, 5000);
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Erro de conexão WebSocket:', error);
        setError('Erro de conexão com o servidor');
        setIsConnected(false);
      });

      socketRef.current.on('stats', (newStats) => {
        setStats(newStats);
      });

      socketRef.current.on('docker:event', (event) => {
        // Processar eventos Docker se necessário
      });

    } catch (err) {
      console.error('❌ Erro ao conectar WebSocket:', err);
      setError('Falha ao conectar com o servidor');
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const sendNotificationTest = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('notification:test');
    }
  }, []);

  useEffect(() => {
    // Carregar stats iniciais primeiro
    loadInitialStats();
    
    // Conectar WebSocket para updates em tempo real
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, [loadInitialStats, connectSocket, disconnectSocket]);

  // Função para obter stats de um container específico
  const getContainerStats = useCallback((containerId) => {
    return stats.find(stat => stat.containerId === containerId);
  }, [stats]);

  // Função para obter stats de containers por status
  const getStatsByStatus = useCallback((status) => {
    return stats.filter(stat => stat.status === status);
  }, [stats]);

  // Função para calcular estatísticas gerais
  const getGeneralStats = useCallback(() => {
    const totalContainers = stats.length;
    const runningContainers = stats.filter(stat => stat.status === 'running').length;
    const stoppedContainers = stats.filter(stat => stat.status === 'exited').length;
    
    const totalCpuUsage = stats.reduce((sum, stat) => sum + (stat.cpu?.percent || 0), 0);
    const totalMemoryUsage = stats.reduce((sum, stat) => sum + (stat.memory?.usageMB || 0), 0);
    
    return {
      totalContainers,
      runningContainers,
      stoppedContainers,
      averageCpu: totalContainers > 0 ? totalCpuUsage / totalContainers : 0,
      averageCpuUsage: totalContainers > 0 ? totalCpuUsage / totalContainers : 0,
      totalMemoryUsage,
    };
  }, [stats]);

  return {
    stats,
    isConnected,
    error,
    isLoading,
    connectSocket,
    disconnectSocket,
    sendNotificationTest,
    getContainerStats,
    getStatsByStatus,
    getGeneralStats,
    loadInitialStats,
  };
};
