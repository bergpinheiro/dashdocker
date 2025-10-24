import { useState, useEffect } from 'react';
import { X, Download, Copy, RotateCcw } from 'lucide-react';
import { apiEndpoints, handleApiError } from '../utils/api';

const LogsModal = ({ isOpen, onClose, containerId, containerName }) => {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tail, setTail] = useState(100);

  const fetchLogs = async (newTail = tail) => {
    if (!containerId) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiEndpoints.containers.getLogs(containerId, newTail);
      setLogs(response.data.data.logs);
    } catch (err) {
      const errorData = handleApiError(err);
      setError(errorData);
      console.error('Erro ao buscar logs:', errorData);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleTailChange = (newTail) => {
    setTail(newTail);
    fetchLogs(newTail);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      // Aqui você pode adicionar um toast de sucesso
      console.log('Logs copiados para a área de transferência');
    } catch (err) {
      console.error('Erro ao copiar logs:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${containerName || containerId}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isOpen && containerId) {
      fetchLogs();
    }
  }, [isOpen, containerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-700 px-6 py-4 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Logs do Container
                </h3>
                <p className="text-sm text-gray-400">
                  {containerName || containerId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="btn btn-secondary text-sm"
                >
                  <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-300">Últimas linhas:</label>
                  <select
                    value={tail}
                    onChange={(e) => handleTailChange(parseInt(e.target.value))}
                    className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="btn btn-secondary text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </button>
                <button
                  onClick={handleDownload}
                  className="btn btn-primary text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-gray-900 p-6">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="loading-spinner"></div>
                <span className="ml-3 text-gray-400">Carregando logs...</span>
              </div>
            )}

            {error && (
              <div className="bg-danger-900/20 border border-danger-500 rounded-lg p-4 mb-4">
                <p className="text-danger-400">
                  Erro ao carregar logs: {error.message}
                </p>
              </div>
            )}

            {!loading && !error && (
              <div className="bg-black rounded-lg p-4 overflow-auto max-h-96">
                <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                  {logs || 'Nenhum log disponível'}
                </pre>
              </div>
            )}

            {!loading && !error && logs && (
              <div className="mt-4 text-sm text-gray-400">
                {logs.split('\n').length - 1} linhas carregadas
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsModal;
