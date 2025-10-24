import { formatContainerStatus } from '../utils/formatters';
import { 
  PlayCircle, 
  StopCircle, 
  RefreshCw, 
  PauseCircle, 
  AlertTriangle, 
  PlusCircle, 
  XCircle, 
  HelpCircle 
} from 'lucide-react';

const StatusBadge = ({ status, size = 'sm' }) => {
  const statusInfo = formatContainerStatus(status);
  
  const iconMap = {
    'play-circle': PlayCircle,
    'stop-circle': StopCircle,
    'refresh-cw': RefreshCw,
    'pause-circle': PauseCircle,
    'alert-triangle': AlertTriangle,
    'plus-circle': PlusCircle,
    'x-circle': XCircle,
    'help-circle': HelpCircle,
  };
  
  const IconComponent = iconMap[statusInfo.icon] || HelpCircle;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };
  
  const colorClasses = {
    success: 'bg-success-100 text-success-800 border-success-200',
    danger: 'bg-danger-100 text-danger-800 border-danger-200',
    warning: 'bg-warning-100 text-warning-800 border-warning-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    primary: 'bg-primary-100 text-primary-800 border-primary-200',
  };
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${sizeClasses[size]}
        ${colorClasses[statusInfo.color]}
      `}
    >
      <IconComponent className="w-3 h-3" />
      {statusInfo.label}
    </span>
  );
};

export default StatusBadge;
