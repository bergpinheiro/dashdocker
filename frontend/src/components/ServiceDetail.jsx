import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDockerServices } from '../hooks/useDockerServices';
import { useContainerStats } from '../hooks/useContainerStats';
import StatusBadge from './StatusBadge';
import StatsChart from './StatsChart';
import LogsModal from './LogsModal';
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
import { formatDateTime, formatBytes, formatPorts, formatEnvVars, formatLabels } from '../utils/formatters';

const ServiceDetail = ({ onLogout }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getServiceById } = useDockerServices();
  const { stats, getContainerStats } = useContainerStats();
  
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [showLogsModal, setShowLogsModal] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      try {
        setLoading(true);
        setError(null);
        const serviceData = await getServiceById(id);
        setService(serviceData);
      } catch (err) {
        setError(err);
        console.error('Erro ao buscar serviço:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchService();
      
      // Polling automático para atualizar dados do serviço a cada 10 segundos
      const interval = setInterval(() => {
        fetchService();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [id, getServiceById]);

  // Usar containers que vêm da API do serviço
  const serviceContainers = service?.containers || [];

  const handleViewLogs = (containerId, containerName) => {
    setSelectedContainer({ id: containerId, name: containerName });
    setShowLogsModal(true);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando detalhes do serviço...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Server className="w-16 h-16 text-danger-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Serviço não encontrado
          </h2>
          <p className="text-gray-400 mb-4">
            {error?.message || 'O serviço solicitado não existe.'}
          </p>
          <button 
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
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
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                <Server className="w-8 h-8 text-primary-500" />
                <div>
                  <h1 className="text-xl font-bold text-white">{service.name}</h1>
                  <p className="text-sm text-gray-400">Detalhes do serviço</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="btn btn-primary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </button>
              <button
                onClick={onLogout}
                className="btn btn-danger"
                title="Sair do dashboard"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informações do Serviço */}
          <div className="lg:col-span-1 space-y-6">
            {/* Informações Básicas */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-white">Informações Básicas</h3>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Nome</p>
                  <p className="text-white font-medium">{service.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Imagem</p>
                  <p className="text-white font-mono text-sm break-all">{service.image}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Réplicas</p>
                  <p className="text-white font-medium">{service.replicas}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Criado em</p>
                  <p className="text-white">{formatDateTime(service.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Atualizado em</p>
                  <p className="text-white">{formatDateTime(service.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Portas */}
            {service.ports && service.ports.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-white">Portas</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-2">
                    {service.ports.map((port, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <span className="text-white font-mono">
                          {port.published}:{port.target}
                        </span>
                        <span className="text-gray-400 text-sm uppercase">
                          {port.protocol}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Variáveis de Ambiente */}
            {service.env && Object.keys(service.env).length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-white">Variáveis de Ambiente</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {formatEnvVars(service.env).map((env, index) => (
                      <div key={index} className="p-2 bg-gray-700 rounded text-sm">
                        <code className="text-green-400">{env.display}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Labels */}
            {service.labels && Object.keys(service.labels).length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-white">Labels</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-2">
                    {formatLabels(service.labels).map((label, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <span className="text-white text-sm">{label.key}</span>
                        <span className="text-gray-400 text-sm">{label.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Containers e Estatísticas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Containers */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-white">Containers</h3>
                <p className="text-sm text-gray-400">
                  {serviceContainers.length} containers encontrados
                </p>
              </div>
              <div className="card-body p-0">
                {serviceContainers.length === 0 ? (
                  <div className="p-6 text-center">
                    <Container className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhum container encontrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead className="table-header">
                        <tr>
                          <th className="table-header-cell">Nome</th>
                          <th className="table-header-cell">Status</th>
                          <th className="table-header-cell">CPU</th>
                          <th className="table-header-cell">Memória</th>
                          <th className="table-header-cell">Uptime</th>
                          <th className="table-header-cell">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="table-body">
                        {serviceContainers.map((container) => {
                          const containerStats = getContainerStats(container.containerId);
                          return (
                            <tr key={container.containerId} className="table-row">
                              <td className="table-cell">
                                <div className="flex items-center gap-2">
                                  <Container className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium">{container.name}</span>
                                </div>
                              </td>
                              <td className="table-cell">
                                <StatusBadge status={container.status} />
                              </td>
                              <td className="table-cell">
                                <div className="flex items-center gap-1">
                                  <Cpu className="w-4 h-4 text-primary-400" />
                                  <span>{containerStats?.cpu?.percent?.toFixed(1) || 0}%</span>
                                </div>
                              </td>
                              <td className="table-cell">
                                <div className="flex items-center gap-1">
                                  <MemoryStick className="w-4 h-4 text-success-400" />
                                  <span>{containerStats?.memory?.usageMB?.toFixed(1) || 0} MB</span>
                                </div>
                              </td>
                              <td className="table-cell">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span>{container.uptime || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="table-cell">
                                <button
                                  onClick={() => handleViewLogs(container.containerId, container.name)}
                                  className="btn btn-secondary text-sm"
                                >
                                  <FileText className="w-4 h-4 mr-1" />
                                  Logs
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Gráficos de Estatísticas */}
            {serviceContainers.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="card">
                  <div className="card-body">
                    <StatsChart
                      data={serviceContainers[0] ? [serviceContainers[0]] : []}
                      type="cpu"
                      height={200}
                      containerName={serviceContainers[0]?.name}
                    />
                  </div>
                </div>
                <div className="card">
                  <div className="card-body">
                    <StatsChart
                      data={serviceContainers[0] ? [serviceContainers[0]] : []}
                      type="memory"
                      height={200}
                      containerName={serviceContainers[0]?.name}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Logs Modal */}
      <LogsModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        containerId={selectedContainer?.id}
        containerName={selectedContainer?.name}
      />
    </div>
  );
};

export default ServiceDetail;
