import { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';

interface HealthStatus {
  isHealthy: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useHealthCheck = (checkInterval: number = 30000) => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    isHealthy: true,
    isLoading: true,
    error: null,
  });

  const checkHealth = async () => {
    try {
      const response = await axiosInstance.get('/health', {
        timeout: 5000, // 5 second timeout
      });
      
      if (response.status === 200 && response.data?.status === 'ok') {
        setHealthStatus({
          isHealthy: true,
          isLoading: false,
          error: null,
        });
      } else {
        setHealthStatus({
          isHealthy: false,
          isLoading: false,
          error: 'Auth service returned unexpected response',
        });
      }
    } catch (error: any) {
      setHealthStatus({
        isHealthy: false,
        isLoading: false,
        error: error.message || 'Unable to connect to auth service',
      });
    }
  };

  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up periodic checks
    const interval = setInterval(checkHealth, checkInterval);

    return () => {
      clearInterval(interval);
    };
  }, [checkInterval]);

  return healthStatus;
};

