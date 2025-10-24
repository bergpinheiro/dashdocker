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
    averageCpu: stats?.cpu?.percent || 0,
    totalMemory: stats?.memory?.usageMB || 0,
  };

  // Determinar cor do card baseado no status do container
  const getCardColor = () => {
    if (container.status === 'running') return 'border-success-500 bg-success-900/20';
    if (container.status === 'exited' || container.status === 'dead') return 'border-danger-500 bg-danger-900/20';
    return 'border-warning-500 bg-warning-900/20';
  };

  // Determinar cor do status
  const getStatusColor = () => {
    if (container.status === 'running') return 'text-success-400';
    if (container.status === 'exited' || container.status === 'dead') return 'text-danger-400';
    return 'text-warning-400';
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
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-primary-600 rounded-lg flex-shrink-0">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate" title={container.name}>
                {container.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <p className={`text-sm ${getStatusColor()} truncate`} title={`${container.status} • ${container.image}`}>
                  {container.status}
                </p>
                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full flex-shrink-0">
                  {nodeName}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate mt-1" title={container.image}>
                {container.image}
              </p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
        </div>
      </div>

      <div className="card-body">
        <div className="space-y-3">
          {/* Status e Node */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${container.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {container.status === 'running' ? 'Executando' : 'Parado'}
              </span>
            </div>
            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
              {nodeName}
            </span>
          </div>

          {/* CPU e Memória */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary-400" />
              <div>
                <p className="text-xs text-gray-400">CPU</p>
                <p className="text-sm text-white">
                  {serviceStats.averageCpu?.toFixed(1) || 0}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MemoryStick className="w-4 h-4 text-primary-400" />
              <div>
                <p className="text-xs text-gray-400">Memória</p>
                <p className="text-sm text-white">
                  {formatNumber(serviceStats.totalMemory)} MB
                </p>
              </div>
            </div>
          </div>

          {/* Imagem */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Imagem</p>
            <p className="text-sm text-white truncate" title={container.image}>
              {container.image}
            </p>
          </div>

          {/* Criado em */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Criado em</p>
            <p className="text-sm text-white">
              {formatDateTime(container.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
