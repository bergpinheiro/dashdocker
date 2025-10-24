import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server, 
  Container, 
  ExternalLink, 
  Settings, 
  Activity,
  Cpu,
  MemoryStick
} from 'lucide-react';
import { formatDateTime, formatNumber } from '../utils/formatters';

const ServiceCard = ({ service, stats = null }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  // service agora é um container individual
  const container = service;
  
  // Obter informações do node
  const nodeId = container.nodeId || 'unknown';
  const nodeName = container.nodeName || nodeId;
  
  // Calcular estatísticas do container
  const serviceStats = {
    totalContainers: 1,
    runningContainers: container.status === 'running' ? 1 : 0,
    stoppedContainers: container.status !== 'running' ? 1 : 0,
    averageCpu: stats && stats.length > 0 ? 
      stats.reduce((sum, s) => sum + (s.cpu?.percent || 0), 0) / stats.length : 0,
    totalMemory: stats && stats.length > 0 ? 
      stats.reduce((sum, s) => sum + (s.memory?.usageMB || 0), 0) : 0,
  };

  // Determinar cor do card baseado no status
  const getCardColor = () => {
    if (serviceStats.runningContainers === 0) return 'border-danger-500 bg-danger-900/20';
    if (serviceStats.runningContainers < serviceStats.totalContainers) return 'border-warning-500 bg-warning-900/20';
    return 'border-success-500 bg-success-900/20';
  };

  // Determinar status geral
  const getOverallStatus = () => {
    if (serviceStats.totalContainers === 0) return 'Sem containers';
    if (serviceStats.runningContainers === 0) return 'Parado';
    if (serviceStats.runningContainers < serviceStats.totalContainers) return 'Parcial';
    return 'Executando';
  };

  // Determinar cor do status
  const getStatusColor = () => {
    if (serviceStats.totalContainers === 0) return 'text-gray-400';
    if (serviceStats.runningContainers === 0) return 'text-danger-400';
    if (serviceStats.runningContainers < serviceStats.totalContainers) return 'text-warning-400';
    return 'text-success-400';
  };

  const handleClick = () => {
    navigate(`/service/${service.id}`);
  };

  return (
    <div
      className={`
        card cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-xl
        ${getCardColor()}
        ${isHovered ? 'shadow-lg' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white truncate">
                {container.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm ${getStatusColor()}`}>
                  {container.status} • {container.image}
                </p>
                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                  {nodeName}
                </span>
              </div>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="card-body">
        <div className="space-y-4">
          {/* Informações básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Imagem</p>
              <p className="text-sm text-white truncate" title={container.image}>
                {container.image}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
              <p className="text-sm text-white">
                {container.status}
              </p>
            </div>
          </div>

          {/* Portas */}
          {container.ports && container.ports.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Portas</p>
              <div className="flex flex-wrap gap-1">
                {container.ports.slice(0, 3).map((port, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                  >
                    {port.published}:{port.target}
                  </span>
                ))}
                {container.ports.length > 3 && (
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                    +{container.ports.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Estatísticas */}
          {stats && stats.length > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary-400" />
                <div>
                  <p className="text-xs text-gray-400">CPU Médio</p>
                  <p className="text-sm font-medium text-white">
                    {serviceStats.averageCpu?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MemoryStick className="w-4 h-4 text-success-400" />
                <div>
                  <p className="text-xs text-gray-400">Memória Total</p>
                  <p className="text-sm font-medium text-white">
                    {serviceStats.totalMemory?.toFixed(1) || 0} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              Atualizado: {formatDateTime(service.updatedAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
