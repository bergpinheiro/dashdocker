import { useState, useEffect, useCallback, useRef } from 'react';
import { apiEndpoints, handleApiError } from '../utils/api';

/**
 * Hook para gerenciar serviços Docker com polling automático e cache
 */
export const useDockerServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const cacheRef = useRef({ data: null, timestamp: 0 });
  const CACHE_DURATION = 2000; // 2 segundos de cache (mais agressivo)

  const fetchServices = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return;
    
    // Verificar cache se não for refresh forçado
    const now = Date.now();
    if (!forceRefresh && cacheRef.current.data && (now - cacheRef.current.timestamp) < CACHE_DURATION) {
      if (isMountedRef.current) {
        setServices(cacheRef.current.data);
        setLoading(false);
      }
      return;
    }

    try {
      if (forceRefresh) {
        setError(null);
        setLoading(true);
      }
      
      const response = await apiEndpoints.cluster.containers();
      
      if (isMountedRef.current) {
        const servicesData = response.data.data || [];
        setServices(servicesData);
        setLastUpdate(new Date());
        setError(null);
        
        // Atualizar cache
        cacheRef.current = {
          data: servicesData,
          timestamp: now
        };
      }
    } catch (err) {
      const errorData = handleApiError(err);
      if (isMountedRef.current) {
        setError(errorData);
        console.error('Erro ao buscar serviços:', errorData);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const fetchServiceById = useCallback(async (serviceId) => {
    try {
      setError(null);
      
      const response = await apiEndpoints.services.getById(serviceId);
      return response.data.data;
    } catch (err) {
      const errorData = handleApiError(err);
      setError(errorData);
      console.error('Erro ao buscar serviço:', errorData);
      throw errorData;
    }
  }, []);

  // Polling automático a cada 5 segundos (mais frequente)
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      fetchServices(false); // Não mostrar loading no polling
    }, 5000);
  }, [fetchServices]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchServices(true); // Primeira carga com loading
    startPolling();

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [fetchServices, startPolling, stopPolling]);

  const refetch = useCallback(() => {
    fetchServices(true); // Refresh forçado
  }, [fetchServices]);

  return {
    services,
    loading,
    error,
    lastUpdate,
    refetch,
    getServiceById: fetchServiceById,
    startPolling,
    stopPolling
  };
};
