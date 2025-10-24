import React, { useState, useEffect } from 'react';
import { apiEndpoints, handleApiError } from '../utils/api';

const NodesOverview = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetchNodes();
    
    // Atualizar a cada 10 segundos
    const interval = setInterval(fetchNodes, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchNodes = async () => {
    try {
      const response = await apiEndpoints.cluster.nodes();
      setNodes(response.data.data || []);
      setError(null);
    } catch (err) {
      const errorData = handleApiError(err);
      setError(errorData);
      console.error('Erro ao buscar nodes:', errorData);
    } finally {
      setLoading(false);
    }
  };

  const getNodeStatusColor = (isOnline) => {
    return isOnline ? 'bg-green-500' : 'bg-red-500';
  };

  const getNodeStatusText = (isOnline) => {
    return isOnline ? 'Online' : 'Offline';
  };

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'Nunca';
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return `${seconds}s atrás`;
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Nodes do Cluster</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Nodes do Cluster</h2>
        <div className="text-red-600">
          <p>Erro ao carregar nodes: {error.message}</p>
          <button 
            onClick={fetchNodes}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Nodes do Cluster</h2>
      
      {nodes.length === 0 ? (
        <p className="text-gray-500">Nenhum node encontrado</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => (
            <div
              key={node.nodeId}
              className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedNode === node.nodeId ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedNode(selectedNode === node.nodeId ? null : node.nodeId)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 truncate" title={node.nodeId}>
                  {node.nodeId}
                </h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getNodeStatusColor(node.isOnline)}`}></div>
                  <span className={`text-xs font-medium ${
                    node.isOnline ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {getNodeStatusText(node.isOnline)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Containers:</span>
                  <span className="font-medium">{node.containerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rodando:</span>
                  <span className="font-medium text-green-600">{node.runningContainers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Última atualização:</span>
                  <span className="text-xs">{formatLastUpdate(node.lastUpdate)}</span>
                </div>
              </div>
              
              {selectedNode === node.nodeId && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-500">
                    <p>ID: {node.nodeId}</p>
                    <p>Atualizado: {new Date(node.lastUpdate).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NodesOverview;
