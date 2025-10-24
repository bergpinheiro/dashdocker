import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDockerServices } from '../hooks/useDockerServices';
import { useContainerStats } from '../hooks/useContainerStats';
import { 
  ArrowLeft, 
  Server, 
  Container, 
  Activity, 
  Cpu, 
  MemoryStick,
  Clock,
  Settings,
  ExternalLink,
  FileText,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { formatDateTime, formatBytes } from '../utils/formatters';

const ServiceDetail = ({ onLogout }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getServiceById } = useDockerServices();
  const { stats, getContainerStats } = useContainerStats();
  
  const [container, setContainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogsModal, setShowLogsModal] = useState(false);

  useEffect(() => {
    const fetchContainer = async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
          setError(null);
        }
        const containerData = await getServiceById(id);
        setContainer(containerData);
      } catch (err) {
        setError(err);
        console.error('Erro ao buscar container:', err);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchContainer(true);
      
      // Polling automático
      const interval = setInterval(() => {
        fetchContainer(false);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [id, getServiceById]);

  // Buscar stats do container
  useEffect(() => {
    if (container) {
      getContainerStats(container.id);
    }
  }, [container, getContainerStats]);

  const handleRefresh = () => {
    if (id) {
      const fetchContainer = async () => {
        try {
          setError(null);
          const containerData = await getServiceById(id);
          setContainer(containerData);
        } catch (err) {
          setError(err);
          console.error('Erro ao buscar container:', err);
        }
      };
      fetchContainer();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando container...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Container className="w-16 h-16 text-danger-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Erro ao carregar container</h2>
          <p className="text-gray-400 mb-4">{error.message}</p>
          <button onClick={handleRefresh} className="btn btn-primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!container) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Container className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Container não encontrado</h2>
          <p className="text-gray-400 mb-4">O container solicitado não foi encontrado.</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Obter stats do container
  const containerStats = stats?.find(stat => stat.id === container.id) || null;
  const nodeId = container.nodeId || 'unknown';
  const nodeName = container.nodeName || nodeId;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Voltar ao Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-600 rounded-lg">
                  <Container className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white truncate max-w-md" title={container.name}>
                    {container.name}
                  </h1>
                  <p className="text-sm text-gray-400">Container Docker</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLogsModal(true)}
                className="btn btn-secondary text-sm"
                title="Ver logs"
              >
                <FileText className="w-4 h-4" />
                Logs
              </button>
              <button
                onClick={handleRefresh}
                className="btn btn-primary text-sm"
                title="Atualizar dados"
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informações do Container */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status e Node */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Status e Localização
                </h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${container.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={`text-lg font-medium ${container.status === 'running' ? 'text-green-400' : 'text-red-400'}`}>
                        {container.status === 'running' ? 'Executando' : 'Parado'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Node</p>
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-blue-400" />
                      <span className="text-lg font-medium text-white">{nodeName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recursos */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  Recursos
                </h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4">
                    <Cpu className="w-8 h-8 text-primary-400" />
                    <div>
                      <p className="text-sm text-gray-400">CPU</p>
                      <p className="text-2xl font-bold text-white">
                        {containerStats?.cpu?.percent?.toFixed(1) || 0}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <MemoryStick className="w-8 h-8 text-primary-400" />
                    <div>
                      <p className="text-sm text-gray-400">Memória</p>
                      <p className="text-2xl font-bold text-white">
                        {formatBytes(containerStats?.memory?.usage || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações da Imagem */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Container className="w-5 h-5" />
                  Imagem
                </h2>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Nome da Imagem</p>
                    <p className="text-white font-mono text-sm break-all" title={container.image}>
                      {container.image}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Criado em</p>
                    <p className="text-white flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {formatDateTime(container.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ações Rápidas */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-white">Ações</h3>
              </div>
              <div className="card-body space-y-3">
                <button
                  onClick={() => setShowLogsModal(true)}
                  className="w-full btn btn-secondary justify-start"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Logs
                </button>
                <button
                  onClick={handleRefresh}
                  className="w-full btn btn-primary justify-start"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </button>
              </div>
            </div>

            {/* Informações Técnicas */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-white">Informações Técnicas</h3>
              </div>
              <div className="card-body space-y-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">ID do Container</p>
                  <p className="text-sm text-white font-mono break-all" title={container.id}>
                    {container.id.substring(0, 12)}...
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Última Atualização</p>
                  <p className="text-sm text-white">
                    {formatDateTime(container.updatedAt || container.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Logs do Container</h3>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="bg-black rounded p-4 h-96 overflow-y-auto">
              <pre className="text-green-400 text-sm font-mono">
                {`Logs do container ${container.name} serão exibidos aqui...`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDetail;