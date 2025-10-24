import { useState, useEffect } from 'react';
import { apiEndpoints } from '../utils/api';
import { 
  AlertTriangle, 
  Cpu, 
  MemoryStick, 
  Settings, 
  TestTube,
  Save,
  RefreshCw
} from 'lucide-react';

const AlertsSettings = ({ onBack }) => {
  const [thresholds, setThresholds] = useState({
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadThresholds();
  }, []);

  const loadThresholds = async () => {
    try {
      setLoading(true);
      const response = await apiEndpoints.alerts.getThresholds();
      if (response.data.success) {
        setThresholds(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar thresholds:', error);
      setMessage('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      
      const response = await apiEndpoints.alerts.updateThresholds(thresholds);
      if (response.data.success) {
        setMessage('Configurações salvas com sucesso!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Erro ao salvar thresholds:', error);
      setMessage('Erro ao salvar configurações: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (type) => {
    try {
      setTesting(true);
      setMessage('');
      
      const response = await apiEndpoints.alerts.test({ type });
      if (response.data.success) {
        setMessage(`Alerta de teste (${type}) enviado!`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      setMessage('Erro ao enviar teste: ' + (error.response?.data?.error || error.message));
    } finally {
      setTesting(false);
    }
  };

  const updateThreshold = (resource, level, value) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;
    
    setThresholds(prev => ({
      ...prev,
      [resource]: {
        ...prev[resource],
        [level]: numValue
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow-md py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="btn btn-secondary p-2 rounded-full">
                ←
              </button>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div>
                <h1 className="text-2xl font-bold text-white">Configurações de Alertas</h1>
                <p className="text-sm text-gray-400">Configure limites de CPU e memória</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadThresholds}
                className="btn btn-secondary"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('sucesso') || message.includes('enviado') 
              ? 'bg-green-900/20 border border-green-500 text-green-300' 
              : 'bg-red-900/20 border border-red-500 text-red-300'
          }`}>
            {message}
          </div>
        )}

        {/* Configurações de CPU */}
        <div className="card bg-gray-800 border border-gray-700 mb-6">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <Cpu className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-bold">Limites de CPU</h2>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Aviso (Warning)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds.cpu.warning}
                    onChange={(e) => updateThreshold('cpu', 'warning', e.target.value)}
                    className="input w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    %
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Alerta quando CPU ultrapassar este valor
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Crítico (Critical)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds.cpu.critical}
                    onChange={(e) => updateThreshold('cpu', 'critical', e.target.value)}
                    className="input w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    %
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Alerta crítico quando CPU ultrapassar este valor
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Configurações de Memória */}
        <div className="card bg-gray-800 border border-gray-700 mb-6">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <MemoryStick className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-bold">Limites de Memória</h2>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Aviso (Warning)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds.memory.warning}
                    onChange={(e) => updateThreshold('memory', 'warning', e.target.value)}
                    className="input w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    %
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Alerta quando memória ultrapassar este valor
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Crítico (Critical)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds.memory.critical}
                    onChange={(e) => updateThreshold('memory', 'critical', e.target.value)}
                    className="input w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    %
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Alerta crítico quando memória ultrapassar este valor
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Testes de Notificação */}
        <div className="card bg-gray-800 border border-gray-700 mb-6">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <TestTube className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-bold">Testes de Notificação</h2>
            </div>
          </div>
          <div className="card-body">
            <p className="text-gray-400 mb-4">
              Teste os diferentes tipos de alertas para verificar se as notificações estão funcionando.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => handleTest('resource')}
                disabled={testing}
                className="btn btn-secondary"
              >
                <Cpu className="w-4 h-4 mr-2" />
                Teste CPU
              </button>
              <button
                onClick={() => handleTest('health')}
                disabled={testing}
                className="btn btn-secondary"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Teste Saúde
              </button>
              <button
                onClick={() => handleTest('stopped')}
                disabled={testing}
                className="btn btn-secondary"
              >
                <Settings className="w-4 h-4 mr-2" />
                Teste Parado
              </button>
              <button
                onClick={() => handleTest('general')}
                disabled={testing}
                className="btn btn-secondary"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Teste Geral
              </button>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onBack}
            className="btn btn-secondary"
          >
            Voltar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            <Save className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default AlertsSettings;
