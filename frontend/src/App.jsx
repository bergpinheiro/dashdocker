import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ServiceDetail from './components/ServiceDetail';
import AlertsSettings from './components/AlertsSettings';
import { apiEndpoints } from './utils/api';
import './styles/index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('dashdocker_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiEndpoints.auth.verify({ token });
      if (response.data.success) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      localStorage.removeItem('dashdocker_token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('dashdocker_token');
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

  const handleShowAlerts = () => {
    setCurrentView('alerts');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
                <Navigate to="/" replace /> : 
                <Login onLogin={handleLogin} />
            } 
          />
              <Route
                path="/"
                element={
                  isAuthenticated ?
                    (currentView === 'alerts' ? 
                      <AlertsSettings onBack={handleBackToDashboard} /> :
                      <Dashboard onLogout={handleLogout} onShowAlerts={handleShowAlerts} />
                    ) :
                    <Navigate to="/login" replace />
                }
              />
          <Route 
            path="/service/:id" 
            element={
              isAuthenticated ? 
                <ServiceDetail onLogout={handleLogout} /> : 
                <Navigate to="/login" replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
