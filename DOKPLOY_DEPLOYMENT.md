# Guia de Deploy no Dokploy

Este documento descreve como fazer o deploy da plataforma Ametista Tarot em uma VPS usando Dokploy.

## Pré-requisitos

- VPS com Docker e Docker Compose instalados
- Domínio configurado (exemplo: ametista-tarot.com)
- Acesso SSH à VPS
- Dokploy instalado e configurado

## Passo 1: Preparar a VPS

### Instalar Docker e Docker Compose

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Clonar o Repositório

```bash
cd /home
git clone https://github.com/rafaeljoia/ametista-tarot.git
cd ametista-tarot
```

## Passo 2: Configurar Variáveis de Ambiente

### Backend (.env)

```bash
cp backend/.env.example backend/.env
```

Edite o arquivo e configure:

```env
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=ametista
DB_PASSWORD=SENHA_SEGURA_AQUI
DB_NAME=ametista_tarot
JWT_SECRET=CHAVE_JWT_SUPER_SEGURA_AQUI
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://seu-dominio.com
PAYMENT_GATEWAY_KEY=sua_chave_pagamento
PAYMENT_GATEWAY_SECRET=seu_secret_pagamento
```

### Frontend (.env.local)

```bash
cp frontend/.env.example frontend/.env.local
```

Edite o arquivo:

```env
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
```

## Passo 3: Iniciar os Serviços

```bash
# Iniciar todos os serviços em background
docker-compose up -d

# Verificar status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f
```

## Passo 4: Configurar Nginx como Proxy Reverso

Crie um arquivo de configuração do Nginx:

```bash
sudo nano /etc/nginx/sites-available/ametista-tarot
```

Adicione a seguinte configuração:

```nginx
upstream frontend {
    server localhost:3000;
}

upstream backend {
    server localhost:3001;
}

server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;

    # Certificados SSL (gerar com Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative a configuração:

```bash
sudo ln -s /etc/nginx/sites-available/ametista-tarot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Passo 5: Configurar SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Gerar certificado
sudo certbot certonly --nginx -d seu-dominio.com -d www.seu-dominio.com

# Auto-renovação
sudo systemctl enable certbot.timer
```

## Passo 6: Monitoramento e Manutenção

### Ver Logs

```bash
# Logs de todos os serviços
docker-compose logs -f

# Logs específicos
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Backup do Banco de Dados

```bash
# Criar backup
docker-compose exec postgres pg_dump -U ametista ametista_tarot > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
docker-compose exec -T postgres psql -U ametista ametista_tarot < backup.sql
```

### Atualizar a Aplicação

```bash
# Parar os serviços
docker-compose down

# Atualizar código
git pull origin main

# Reconstruir e iniciar
docker-compose up -d --build
```

## Passo 7: Configurar Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Troubleshooting

### Container não inicia

```bash
docker-compose logs backend
docker-compose logs frontend
```

### Conexão recusada ao banco de dados

Verifique se o PostgreSQL está rodando:

```bash
docker-compose ps postgres
```

### WebSocket não conecta

Verifique a configuração do Nginx para `/socket.io`

### Certificado SSL expirado

```bash
sudo certbot renew --dry-run
sudo certbot renew
```

## Performance e Escalabilidade

### Aumentar recursos

Edite `docker-compose.yml` e adicione limites de recursos:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Usar CDN para arquivos estáticos

Configure um CDN (CloudFlare, AWS CloudFront, etc.) para servir arquivos estáticos do frontend.

## Suporte

Para problemas ou dúvidas, abra uma issue no repositório do GitHub.
