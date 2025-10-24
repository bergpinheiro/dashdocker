#!/bin/bash

echo "🚀 Construindo imagens do DashDocker..."

# Build da imagem do dashboard
echo "📦 Construindo dashboard..."
docker build --target dashboard -t dashdocker:latest .

# Build da imagem do agente
echo "🤖 Construindo agente..."
docker build --target agent -t dashdocker-agent:latest .

echo "✅ Imagens construídas com sucesso!"
echo ""
echo "📋 Imagens disponíveis:"
docker images | grep dashdocker
echo ""
echo "🚀 Para fazer deploy:"
echo "  docker stack deploy -c docker-stack.yml dashdocker"
