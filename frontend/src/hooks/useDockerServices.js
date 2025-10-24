import { useState, useEffect, useCallback } from 'react';
import { apiEndpoints, handleApiError } from '../utils/api';

/**
 * Hook para gerenciar serviços Docker
 */
export const useDockerServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiEndpoints.services.list();
      setServices(response.data.data || []);
    } catch (err) {
      const errorData = handleApiError(err);
      setError(errorData);
      console.error('Erro ao buscar serviços:', errorData);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServiceById = useCallback(async (serviceId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiEndpoints.services.getById(serviceId);
      return response.data.data;
    } catch (err) {
      const errorData = handleApiError(err);
      setError(errorData);
      console.error('Erro ao buscar serviço:', errorData);
      throw errorData;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
    getServiceById: fetchServiceById,
  };
};
