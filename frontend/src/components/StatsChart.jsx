import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDateTime, formatPercent, formatBytes } from '../utils/formatters';

const StatsChart = ({ 
  data = [], 
  type = 'cpu', 
  height = 200, 
  showLegend = true,
  containerName = 'Container' 
}) => {
  // Processar dados para o gráfico
  const chartData = data.map(item => ({
    timestamp: new Date(item.timestamp).getTime(),
    time: new Date(item.timestamp).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    cpu: item.cpu?.percent || 0,
    memory: item.memory?.usageMB || 0,
    memoryPercent: item.memory?.percent || 0,
  }));

  // Configuração do tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm mb-2">
            {formatDateTime(new Date(data.timestamp))}
          </p>
          {type === 'cpu' && (
            <p className="text-primary-400">
              CPU: {formatPercent(data.cpu)}
            </p>
          )}
          {type === 'memory' && (
            <>
              <p className="text-success-400">
                Memória: {formatBytes(data.memory * 1024 * 1024)}
              </p>
              <p className="text-success-400">
                Percentual: {formatPercent(data.memoryPercent)}
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Configuração das linhas baseada no tipo
  const renderLines = () => {
    if (type === 'cpu') {
      return (
        <Line
          type="monotone"
          dataKey="cpu"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="CPU %"
        />
      );
    } else if (type === 'memory') {
      return (
        <>
          <Line
            type="monotone"
            dataKey="memory"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Memória (MB)"
          />
          <Line
            type="monotone"
            dataKey="memoryPercent"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="Memória %"
          />
        </>
      );
    }
    return null;
  };

  // Configuração do eixo Y baseada no tipo
  const getYAxisConfig = () => {
    if (type === 'cpu') {
      return {
        domain: [0, 100],
        tickFormatter: (value) => `${value}%`,
      };
    } else if (type === 'memory') {
      return {
        domain: ['dataMin', 'dataMax'],
        tickFormatter: (value) => formatBytes(value * 1024 * 1024),
      };
    }
    return {};
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">📊</div>
          <p className="text-gray-400">Nenhum dado disponível</p>
          <p className="text-gray-500 text-sm">Aguardando dados de {containerName}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">
          {type === 'cpu' ? 'Uso de CPU' : 'Uso de Memória'}
        </h3>
        <p className="text-sm text-gray-400">
          {containerName} - Últimos {data.length} pontos
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="time"
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            {...getYAxisConfig()}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {renderLines()}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatsChart;
