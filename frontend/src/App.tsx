import Router from './Router'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import HealthBanner from './components/HealthBanner/HealthBanner'

function AppContent() {
  const { loading } = useAuthContext();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return <Router />;
}

function App() {
  return (
    <div className="app">
      <HealthBanner />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </div>
  )
}

export default App

