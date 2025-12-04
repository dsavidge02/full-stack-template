import Router from './Router'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <div className="app">
      <AuthProvider>
        <Router />
      </AuthProvider>
    </div>
  )
}

export default App

