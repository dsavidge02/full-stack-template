import { useState, useEffect } from 'react';
import twitchAxios from '../api/twitchAxios';

interface HealthStatus {
  isHealthy: boolean;
  isAdminReady: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useTwitchHealthCheck = (checkInterval: number = 30000) => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    isHealthy: true,
    isAdminReady: true,
    isLoading: true,
    error: null,
  });

  const checkHealth = async () => {
    try {
      // Check both health and status endpoints
      const [healthResponse, statusResponse] = await Promise.allSettled([
        twitchAxios.get('/health', { timeout: 5000 }),
        twitchAxios.get('/status', { timeout: 5000 })
      ]);

      // Check health endpoint
      let isHealthy = false;
      let isAdminReady = false;
      let error: string | null = null;

      if (healthResponse.status === 'fulfilled' && 
          healthResponse.value.status === 200 && 
          healthResponse.value.data?.status === 'ok') {
        isHealthy = true;
      } else {
        isHealthy = false;
        error = 'Twitch service is not responding';
      }

      // Check status endpoint (admin token initialization)
      if (statusResponse.status === 'fulfilled' && 
          statusResponse.value.status === 200) {
        const statusData = statusResponse.value.data;
        isAdminReady = statusData?.initialized === true;
        
        if (!isAdminReady && isHealthy) {
          // Service is up but admin token not initialized
          error = 'Admin token is not initialized';
        }
      } else {
        // If status check fails, assume admin is not ready
        isAdminReady = false;
        if (isHealthy) {
          error = 'Unable to check admin service status';
        }
      }

      setHealthStatus({
        isHealthy,
        isAdminReady,
        isLoading: false,
        error,
      });
    } catch (error: any) {
      setHealthStatus({
        isHealthy: false,
        isAdminReady: false,
        isLoading: false,
        error: error.message || 'Unable to connect to Twitch service',
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

