import { useState, useEffect } from 'react';
import { useDockerServices } from '../hooks/useDockerServices';
import { useContainerStats } from '../hooks/useContainerStats';
import ServiceCard from './ServiceCard';
import { 
  Server, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Bell,
  Wifi,
  WifiOff,
  LogOut
} from 'lucide-react';

const Dashboard = ({ onLogout }) => {
  const { services, loading: servicesLoading, error: servicesError, refetch: refetchServices } = useDockerServices();
  const { stats, isConnected, error: statsError, getGeneralStats } = useContainerStats();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Atualizar timestamp a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Agrupar stats por serviço (assumindo que o nome do container contém o nome do serviço)
  const getServiceStats = (service) => {
    return stats.filter(stat => 
      stat.name.includes(service.name) || 
      service.name.includes(stat.name)
    );
  };

  const generalStats = getGeneralStats();

  const handleRefresh = () => {
    refetchServices();
  };

  const handleTestNotification = () => {
    // Implementar teste de notificação
    console.log('Testando notificação...');
  };

  if (servicesLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando serviços Docker...</p>
        </div>
      </div>
    );
  }

  if (servicesError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-danger-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Erro ao carregar dados</h2>
          <p className="text-gray-400 mb-4">{servicesError.message}</p>
          <button onClick={handleRefresh} className="btn btn-primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Server className="w-8 h-8 text-primary-500" />
                <h1 className="text-xl font-bold text-white">DashDocker</h1>
              </div>
              
              {/* Status de conexão */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <div className="flex items-center gap-1 text-success-400">
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm">Conectado</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-danger-400">
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm">Desconectado</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Estatísticas gerais */}
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success-400" />
                  <span className="text-gray-300">
                    {generalStats.runningContainers} executando
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-danger-400" />
                  <span className="text-gray-300">
                    {generalStats.stoppedContainers} parados
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-400" />
                  <span className="text-gray-300">
                    {generalStats.averageCpu?.toFixed(1) || 0}% CPU médio
                  </span>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestNotification}
                  className="btn btn-secondary text-sm"
                  title="Testar notificação WhatsApp"
                >
                  <Bell className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRefresh}
                  className="btn btn-primary text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
                </button>
                <button
                  onClick={onLogout}
                  className="btn btn-danger text-sm"
                  title="Sair do dashboard"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total de Serviços</p>
                  <p className="text-2xl font-bold text-white">{services.length}</p>
                </div>
                <Server className="w-8 h-8 text-primary-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Containers Ativos</p>
                  <p className="text-2xl font-bold text-success-500">
                    {generalStats.runningContainers}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-success-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Containers Parados</p>
                  <p className="text-2xl font-bold text-danger-500">
                    {generalStats.stoppedContainers}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-danger-500" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">CPU Médio</p>
                  <p className="text-2xl font-bold text-warning-500">
                    {generalStats.averageCpu?.toFixed(1) || 0}%
                  </p>
                </div>
                <Activity className="w-8 h-8 text-warning-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Serviços Docker</h2>
            <div className="text-sm text-gray-400">
              Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
            </div>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-12">
              <Server className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">
                Nenhum serviço encontrado
              </h3>
              <p className="text-gray-500">
                Não há serviços Docker em execução no momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  stats={getServiceStats(service)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Error Messages */}
        {statsError && (
          <div className="bg-danger-900/20 border border-danger-500 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger-400" />
              <p className="text-danger-400">
                Erro ao conectar com o servidor: {statsError}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
