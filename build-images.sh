#!/bin/bash

# Script para construir ambas as imagens do DashDocker

echo "🚀 Construindo imagens do DashDocker..."

# Build da imagem principal (dashboard)
echo "📦 Construindo imagem principal (dashdocker:latest)..."
docker build -t dashdocker:latest .

# Build da imagem do agente
echo "🤖 Construindo imagem do agente (dashdocker-agent:latest)..."
docker build -f Dockerfile.agent -t dashdocker-agent:latest .

echo "✅ Imagens construídas com sucesso!"
echo ""
echo "📋 Imagens disponíveis:"
echo "  - dashdocker:latest (Dashboard principal)"
echo "  - dashdocker-agent:latest (Agente distribuído)"
echo ""
echo "🚀 Para fazer deploy:"
echo "  docker stack deploy -c docker-stack.yml dashdocker"
