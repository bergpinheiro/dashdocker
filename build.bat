@echo off
echo 🚀 Construindo imagens do DashDocker...

REM Build da imagem do dashboard
echo 📦 Construindo dashboard...
docker build --target dashboard -t dashdocker:latest .

REM Build da imagem do agente
echo 🤖 Construindo agente...
docker build --target agent -t dashdocker-agent:latest .

echo ✅ Imagens construídas com sucesso!
echo.
echo 📋 Imagens disponíveis:
docker images | findstr dashdocker
echo.
echo 🚀 Para fazer deploy:
echo   docker stack deploy -c docker-stack.yml dashdocker
