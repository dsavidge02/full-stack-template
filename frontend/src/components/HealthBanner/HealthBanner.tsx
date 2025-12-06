import './HealthBanner.css';
import { useHealthCheck } from '../../hooks/useHealthCheck';

const HealthBanner = () => {
  const { isHealthy, isLoading, error } = useHealthCheck();

  // Don't show banner if healthy or still loading
  if (isHealthy || isLoading) {
    return null;
  }

  return (
    <div className="health-banner" role="alert">
      <div className="health-banner-content">
        <span className="health-banner-icon">⚠️</span>
        <div className="health-banner-text">
          <strong>Auth Service Unavailable</strong>
          <span className="health-banner-message">
            {error || 'The authentication service is not responding. Some features may not work correctly.'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HealthBanner;

