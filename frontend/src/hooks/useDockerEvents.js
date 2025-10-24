import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * Hook para gerenciar eventos Docker em tempo real
 */
export const useDockerEvents = () => {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const maxEvents = 100; // Manter apenas os últimos 100 eventos

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const API_URL = import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.host);
    
    try {
      socketRef.current = io(API_URL, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        maxReconnectionAttempts: 5,
      });

      socketRef.current.on('connect', () => {
        setIsConnected(true);
        setError(null);
      });

      socketRef.current.on('disconnect', (reason) => {
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Erro de conexão WebSocket:', error);
        setError('Erro de conexão com o servidor');
        setIsConnected(false);
      });

      socketRef.current.on('docker:event', (event) => {
        setEvents(prevEvents => {
          const newEvents = [event, ...prevEvents];
          // Manter apenas os últimos maxEvents
          return newEvents.slice(0, maxEvents);
        });
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
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket]);

  // Função para obter eventos por tipo
  const getEventsByType = useCallback((type) => {
    return events.filter(event => event.type === type);
  }, [events]);

  // Função para obter eventos por ação
  const getEventsByAction = useCallback((action) => {
    return events.filter(event => event.action === action);
  }, [events]);

  // Função para obter eventos críticos
  const getCriticalEvents = useCallback(() => {
    return events.filter(event => event.isCritical);
  }, [events]);

  // Função para obter eventos de um container específico
  const getEventsByContainer = useCallback((containerId) => {
    return events.filter(event => event.containerId === containerId);
  }, [events]);

  // Função para obter eventos recentes (últimos N minutos)
  const getRecentEvents = useCallback((minutes = 10) => {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return events.filter(event => new Date(event.timestamp) > cutoffTime);
  }, [events]);

  // Função para limpar eventos
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Função para obter estatísticas de eventos
  const getEventStats = useCallback(() => {
    const stats = {
      total: events.length,
      critical: events.filter(e => e.isCritical).length,
      byType: {},
      byAction: {},
      recent: getRecentEvents(10).length,
    };

    events.forEach(event => {
      // Contar por tipo
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
      
      // Contar por ação
      stats.byAction[event.action] = (stats.byAction[event.action] || 0) + 1;
    });

    return stats;
  }, [events, getRecentEvents]);

  return {
    events,
    isConnected,
    error,
    connectSocket,
    disconnectSocket,
    getEventsByType,
    getEventsByAction,
    getCriticalEvents,
    getEventsByContainer,
    getRecentEvents,
    clearEvents,
    getEventStats,
  };
};
