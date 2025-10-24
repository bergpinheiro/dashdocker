# 🚀 Configuração do Repositório Git

## 📋 Passos para Criar e Configurar o Repositório

### 1. Criar Repositório no GitHub/GitLab

#### Opção A: GitHub
1. Acesse [GitHub](https://github.com)
2. Clique em "New repository"
3. Nome: `dashdocker` ou `docker-monitoring-dashboard`
4. Descrição: `Dashboard para monitoramento de serviços Docker em tempo real com notificações WhatsApp`
5. Marque como **Private**
6. **NÃO** inicialize com README, .gitignore ou LICENSE (já temos)
7. Clique em "Create repository"

#### Opção B: GitLab
1. Acesse [GitLab](https://gitlab.com)
2. Clique em "New project"
3. Escolha "Create blank project"
4. Nome: `dashdocker`
5. Descrição: `Dashboard para monitoramento de serviços Docker em tempo real com notificações WhatsApp`
6. Marque como **Private**
7. **NÃO** inicialize com README
8. Clique em "Create project"

### 2. Configurar Repositório Remoto

Após criar o repositório, execute os comandos abaixo:

```bash
# Adicionar repositório remoto (substitua pela URL do seu repositório)
git remote add origin https://github.com/SEU_USUARIO/dashdocker.git

# Ou se for GitLab:
git remote add origin https://gitlab.com/SEU_USUARIO/dashdocker.git

# Verificar configuração
git remote -v

# Fazer push do código
git branch -M main
git push -u origin main
```

### 3. Comandos Úteis

```bash
# Ver status do repositório
git status

# Adicionar arquivos modificados
git add .

# Fazer commit
git commit -m "Descrição da mudança"

# Fazer push
git push

# Ver histórico de commits
git log --oneline

# Criar nova branch
git checkout -b feature/nova-funcionalidade

# Voltar para main
git checkout main

# Fazer merge de branch
git merge feature/nova-funcionalidade
```

### 4. Estrutura do Projeto no Git

```
dashdocker/
├── .gitignore                 # Arquivos ignorados pelo Git
├── .dockerignore             # Arquivos ignorados pelo Docker
├── LICENSE                   # Licença MIT
├── README.md                 # Documentação principal
├── package.json              # Scripts do projeto
├── env.example              # Exemplo de variáveis de ambiente
├── Dockerfile               # Build multi-stage
├── docker-compose.yml       # Desenvolvimento local
├── docker-stack.yml         # Docker Swarm
├── nginx.conf               # Configuração Nginx
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── config/         # Configurações
│   │   ├── middleware/     # Middlewares
│   │   ├── routes/         # Endpoints API
│   │   ├── services/       # Lógica de negócio
│   │   └── utils/          # Utilitários
│   └── package.json
└── frontend/               # SPA React
    ├── src/
    │   ├── components/     # Componentes React
    │   ├── hooks/          # Hooks personalizados
    │   ├── utils/          # Utilitários
    │   └── styles/         # Estilos CSS
    └── package.json
```

### 5. Proteções de Branch (Recomendado)

Configure no GitHub/GitLab:

1. **Branch Protection Rules** para `main`:
   - Require pull request reviews
   - Require status checks to pass
   - Require branches to be up to date
   - Restrict pushes to main branch

2. **Secrets** para CI/CD:
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD`
   - `WAHA_TOKEN`
   - `DASHBOARD_PASSWORD`

### 6. CI/CD (Opcional)

Para automatizar builds e deploys, você pode adicionar:

- **GitHub Actions** (`.github/workflows/`)
- **GitLab CI** (`.gitlab-ci.yml`)
- **Docker Hub** para imagens
- **Docker Registry** privado

### 7. Colaboradores

Para adicionar colaboradores:

#### GitHub:
1. Settings → Manage access
2. Invite a collaborator
3. Escolher permissão (Read/Write/Admin)

#### GitLab:
1. Project → Members
2. Invite members
3. Escolher role (Guest/Reporter/Developer/Maintainer/Owner)

## 🔐 Segurança

- ✅ Repositório privado
- ✅ .gitignore configurado
- ✅ Arquivos sensíveis ignorados (.env)
- ✅ Licença MIT
- ✅ Documentação completa

## 📞 Suporte

Se tiver problemas com o Git:

1. Verificar configuração: `git config --list`
2. Verificar remoto: `git remote -v`
3. Verificar status: `git status`
4. Ver logs: `git log --oneline`

---

**Repositório configurado com sucesso! 🎉**
