# Ametista Tarot - Plataforma de Atendimento Online de Cartomancia

Plataforma completa para atendimento online de cartomancia, tarot, astrologia e práticas espirituais. Desenvolvida com Next.js, NestJS, PostgreSQL e Docker.

## Características

- **Autenticação Segura**: Registro e login com JWT
- **Perfis de Consultores**: Listagem com especialidades, avaliações e disponibilidade
- **Sistema de Créditos**: Compra de créditos para minutos de consulta
- **Chat em Tempo Real**: Comunicação via WebSocket entre clientes e consultores
- **Integração de Pagamentos**: Suporte para múltiplos gateways (Mercado Pago, Stripe, etc.)
- **Dashboards**: Interfaces para clientes e consultores
- **Responsive Design**: Interface moderna com Tailwind CSS

## Stack Tecnológico

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Axios
- Socket.io Client

### Backend
- NestJS 10
- TypeScript
- PostgreSQL
- TypeORM
- JWT Authentication
- Socket.io (WebSockets)

### Infraestrutura
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

## Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 18+ (para desenvolvimento local)
- npm ou yarn

## Instalação e Execução

### Com Docker Compose (Recomendado)

1. Clone o repositório:
```bash
git clone https://github.com/rafaeljoia/ametista-tarot.git
cd ametista-tarot
```

2. Copie os arquivos de ambiente:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

3. Inicie os serviços:
```bash
docker-compose up -d
```

4. Acesse a aplicação:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Desenvolvimento Local

#### Backend

```bash
cd backend
npm install
npm run dev
```

O backend rodará em `http://localhost:3001`

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend rodará em `http://localhost:3000`

## Variáveis de Ambiente

### Backend (.env)

```env
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=ametista
DB_PASSWORD=ametista123
DB_NAME=ametista_tarot
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Estrutura do Projeto

```
ametista-tarot/
├── frontend/                 # Aplicação Next.js
│   ├── app/
│   │   ├── auth/            # Páginas de autenticação
│   │   ├── dashboard/       # Dashboard do usuário
│   │   ├── chat/            # Interface de chat
│   │   └── styles/          # Estilos globais
│   ├── package.json
│   └── Dockerfile
├── backend/                  # Aplicação NestJS
│   ├── src/
│   │   ├── auth/            # Módulo de autenticação
│   │   ├── consultants/     # Módulo de consultores
│   │   ├── users/           # Módulo de usuários
│   │   ├── payments/        # Módulo de pagamentos
│   │   ├── chat/            # Módulo de chat
│   │   ├── database/        # Entidades e configuração
│   │   └── config/          # Configurações
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml       # Orquestração de containers
└── README.md
```

## API Endpoints

### Autenticação
- `POST /auth/register` - Registrar novo usuário
- `POST /auth/login` - Fazer login

### Consultores
- `GET /consultants` - Listar todos os consultores
- `GET /consultants/:id` - Obter detalhes de um consultor

### Usuários
- `GET /users/me` - Obter perfil do usuário autenticado
- `GET /users/:id` - Obter dados do usuário
- `POST /users/:id/credits/add` - Adicionar créditos
- `GET /users/:id/credits/history` - Histórico de créditos

### Pagamentos (Mercado Pago — PIX e Cartão)
- `GET  /payments/config` — Pacotes disponíveis e public key do MP
- `GET  /payments/packages` — Lista de pacotes de créditos
- `POST /payments/pix` — Gera cobrança PIX (auth) → retorna QR Code + copia-e-cola
- `POST /payments/card` — Cobra cartão tokenizado pelo SDK do Mercado Pago (auth)
- `GET  /payments/transactions` — Lista as transações do usuário (auth)
- `GET  /payments/transactions/:id` — Detalhe da transação (usado no polling do PIX)
- `POST /payments/webhook` — Webhook do Mercado Pago (assinatura HMAC validada)

#### Configuração do Mercado Pago

1. Crie uma aplicação em https://www.mercadopago.com.br/developers/panel/app
2. Copie o **Access Token** e o **Public Key** (TEST em dev, APP_USR em produção)
3. Em **Webhooks → Configurar notificações**, registre a URL pública
   `https://SEU_DOMINIO/api/payments/webhook` para o evento `payment` e copie a
   **chave secreta de assinatura**
4. Defina as variáveis no `.env` do backend:
   ```env
   MP_ACCESS_TOKEN=APP_USR-...
   MP_PUBLIC_KEY=APP_USR-...
   MP_WEBHOOK_SECRET=...
   ```
5. (Opcional) Configure SMTP para enviar e-mails de confirmação automáticos:
   ```env
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=...
   SMTP_PASS=...
   SMTP_FROM=Ametista Tarot <no-reply@seudominio.com>
   ```
   Sem SMTP, as confirmações são gravadas em log.

#### Pacotes de créditos

| ID        | Valor   | Créditos | Bônus |
|-----------|---------|----------|-------|
| pkg_20    | R$ 20   | 20       | —     |
| pkg_50    | R$ 50   | 55       | +5    |
| pkg_100   | R$ 100  | 115      | +15   |
| pkg_200   | R$ 200  | 240      | +40   |

Crédito é creditado **uma única vez** por transação (idempotência garantida via
`creditedAt` + lock pessimista no banco) — webhooks duplicados do MP nunca
causam crédito duplo.

### Chat (WebSocket)
- `join-consultation` - Entrar em uma consulta
- `send-message` - Enviar mensagem
- `typing` - Indicar que está digitando
- `stop-typing` - Parar de digitar

## Deploy no Dokploy

1. **Preparar a VPS**:
   - Instale Docker e Docker Compose
   - Clone o repositório

2. **Configurar Variáveis de Ambiente**:
   - Atualize os arquivos `.env` com valores de produção
   - Altere o `JWT_SECRET` para um valor seguro

3. **Iniciar com Docker Compose**:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

4. **Configurar Reverse Proxy (Nginx)**:
   - Configure um proxy reverso para rotear as requisições
   - Configure SSL/TLS com Let's Encrypt

5. **Monitoramento**:
   - Use `docker-compose logs -f` para ver os logs
   - Configure alertas para monitorar a saúde dos serviços

## Próximos Passos (Roadmap)

- [ ] Integração com Mercado Pago/Stripe
- [ ] Suporte a vídeo chamadas (WebRTC)
- [ ] Sistema de avaliações e comentários
- [ ] Agendamento de consultas
- [ ] Notificações por email/SMS
- [ ] Painel administrativo
- [ ] Relatórios e analytics
- [ ] Suporte multi-idioma

## Contribuindo

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.

## Licença

Este projeto está licenciado sob a Licença MIT.

## Suporte

Para suporte, abra uma issue no repositório do GitHub ou entre em contato através do email de suporte.

---

_Last deploy trigger: 2026-05-02T23:01:53Z — premium UI overhaul + chat FK hotfix (commit 2cbd816)._
