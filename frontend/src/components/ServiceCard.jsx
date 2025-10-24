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

  // Usar containers do serviço se disponível, senão usar stats
  const containers = service.containers || [];
  const hasContainers = containers.length > 0;
  
  // Obter informações do node
  const nodeId = service.nodeId || 'unknown';
  const nodeName = service.nodeName || nodeId;
  
  // Calcular estatísticas do serviço
  let serviceStats;
  
  if (hasContainers) {
    // Usar containers do serviço
    serviceStats = {
      totalContainers: containers.length,
      runningContainers: containers.filter(c => c.status === 'running').length,
      stoppedContainers: containers.filter(c => c.status === 'exited' || c.status === 'dead').length,
      averageCpu: stats && stats.length > 0 ? 
        stats.reduce((sum, s) => sum + (s.cpu?.percent || 0), 0) / stats.length : 0,
      totalMemory: stats && stats.length > 0 ? 
        stats.reduce((sum, s) => sum + (s.memory?.usageMB || 0), 0) : 0,
    };
  } else if (stats && stats.length > 0) {
    // Fallback: usar stats se não houver containers
    serviceStats = {
      totalContainers: stats.length,
      runningContainers: stats.filter(s => s.status === 'running').length,
      stoppedContainers: stats.filter(s => s.status === 'exited' || s.status === 'dead').length,
      averageCpu: stats.reduce((sum, s) => sum + (s.cpu?.percent || 0), 0) / stats.length,
      totalMemory: stats.reduce((sum, s) => sum + (s.memory?.usageMB || 0), 0),
    };
  } else {
    // Sem dados
    serviceStats = {
      totalContainers: 0,
      runningContainers: 0,
      stoppedContainers: 0,
      averageCpu: 0,
      totalMemory: 0,
    };
  }

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
                {service.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm ${getStatusColor()}`}>
                  {getOverallStatus()} • {serviceStats.runningContainers}/{serviceStats.totalContainers} containers
                  {serviceStats.stoppedContainers > 0 && (
                    <span className="text-danger-400 ml-1">
                      ({serviceStats.stoppedContainers} parados)
                    </span>
                  )}
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
              <p className="text-sm text-white truncate" title={service.image}>
                {service.image}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Réplicas</p>
              <p className="text-sm text-white">
                {formatNumber(service.replicas)}
              </p>
            </div>
          </div>

          {/* Portas */}
          {service.ports && service.ports.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Portas</p>
              <div className="flex flex-wrap gap-1">
                {service.ports.slice(0, 3).map((port, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                  >
                    {port.published}:{port.target}
                  </span>
                ))}
                {service.ports.length > 3 && (
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                    +{service.ports.length - 3}
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
