# Plano WebRTC — Voz e Vídeo (Ametista Tarot)

**Status:** Planejado. Aprovação dada em 2026-05-02.
**Decisões já tomadas:**
- Preços **globais** (3 valores que valem pra plataforma toda).
- Comissão do consultor continua **por consultor** (coluna `commissionPercent` já existe).
- Consultas antigas migradas como `kind='chat'`, `pricePerMinute → preço de chat`.
- Uma **única tela** `/call/[id]?kind=...` adapta o layout.
- TURN auto-hospedado via `coturn` no docker-compose da VPS Hostinger.

---

## 1. Modelo de dados

### 1.1 Nova tabela `system_settings` (key/value, 1 linha por chave)

| key                | value (numeric) | descrição                       |
|--------------------|-----------------|---------------------------------|
| `price_chat_per_min`  | 1.00         | R$/min cobrado do cliente — chat   |
| `price_voice_per_min` | 3.00         | R$/min cobrado do cliente — voz    |
| `price_video_per_min` | 5.00         | R$/min cobrado do cliente — vídeo  |

Por que tabela em vez de env: futura admin UI consegue editar sem redeploy.
Backend expõe `GET/PUT /api/admin/pricing` (admin-only).

### 1.2 Coluna `kind` em `consultations`

```sql
ALTER TABLE consultations
  ADD COLUMN "kind" varchar(16) NOT NULL DEFAULT 'chat';
-- backfill: linhas antigas já caem em 'chat' por causa do default.
```

`kind ∈ { 'chat', 'voice', 'video' }`. Set no momento do `accept-call`.

### 1.3 Deprecar `consultants.pricePerMinute`

A coluna **fica no schema** (compat), mas **não é mais lida pelo billing**.
O preço sempre vem do `system_settings`. Coluna pode ser removida numa migration futura quando garantido que nada mais lê.

---

## 2. Billing

`BillingService.chargeForMinutes` passa a:

1. Ler `consultation.kind`.
2. Buscar a chave correspondente em `system_settings` (cache em memória, refresh 60s).
3. Comissão do consultor continua vindo de `consultant.commissionPercent`.

`ConsultantEarning` continua sendo escrito do mesmo jeito, mas com base no novo preço. Sem mudança de schema em earnings.

---

## 3. Sinalização WebRTC (backend)

### 3.1 Novos eventos no `ChatGateway`

Todos com authz: `socket.identity` precisa ser `clientId` ou `consultantId` da consulta.

| Evento                   | Direção         | Payload                                                |
|--------------------------|-----------------|--------------------------------------------------------|
| `webrtc-offer`           | A → B (via servidor) | `{ consultationId, sdp }`                          |
| `webrtc-answer`          | B → A           | `{ consultationId, sdp }`                              |
| `webrtc-ice-candidate`   | bidirecional    | `{ consultationId, candidate }`                        |
| `webrtc-call-end`        | bidirecional    | `{ consultationId, reason }`                           |
| `webrtc-media-toggle`    | bidirecional    | `{ consultationId, mic?: bool, camera?: bool }`        |

Servidor não inspeciona SDP, só repassa. Sala = `consultationId` (mesma do chat).

### 3.2 Endpoint `GET /api/webrtc/ice-servers`

Retorna lista de ICE servers + credenciais TTL. Auth obrigatória (qualquer role).

```json
{
  "iceServers": [
    { "urls": ["stun:stun.l.google.com:19302"] },
    {
      "urls": ["turn:turn.ametista.braviaglobal.com.br:3478?transport=udp",
               "turn:turn.ametista.braviaglobal.com.br:3478?transport=tcp"],
      "username": "<unix_ts>:<consultationId>",
      "credential": "<HMAC-SHA1(secret, username)>"
    }
  ],
  "ttl": 3600
}
```

Padrão **TURN REST API** (RFC draft `draft-uberti-behave-turn-rest`). Coturn nativamente suporta esse esquema com `--use-auth-secret --static-auth-secret=<secret>`.

Secret armazenado em env var `TURN_SHARED_SECRET` (Replit Secrets / Dokploy env).

---

## 4. Frontend — tela única `/call/[id]`

Substitui a tela atual `/chat/[id]` para os 3 tipos. A `/chat/[id]` redireciona para `/call/[id]?kind=chat` (preserva URLs antigas).

Layout adaptativo:

| kind   | Vídeo remoto         | Vídeo local         | Chat lateral |
|--------|---------------------|--------------------|--------------|
| chat   | —                   | —                  | tela cheia   |
| voice  | placeholder + waveform | —              | abaixo       |
| video  | tela cheia          | thumbnail (PiP)    | drawer lateral |

Controles fixos no rodapé: **mute/unmute** (voz/vídeo), **camera on/off** (só vídeo), **encerrar** (só cliente, regra atual mantida).

Versão consultor (`/consultant-call/[id]`): mesmo layout, sem botão encerrar.

---

## 5. Infra — coturn no docker-compose

### 5.1 Serviço novo

```yaml
coturn:
  image: coturn/coturn:4.6
  network_mode: host  # IMPORTANTE — NAT gateway precisa do host network
  restart: unless-stopped
  volumes:
    - ./coturn/turnserver.conf:/etc/coturn/turnserver.conf:ro
  environment:
    - TURN_SHARED_SECRET=${TURN_SHARED_SECRET}
```

### 5.2 `coturn/turnserver.conf`

```
listening-port=3478
fingerprint
use-auth-secret
static-auth-secret=__REPLACED_AT_BOOT__
realm=ametista.braviaglobal.com.br
total-quota=100
stale-nonce=600
no-tls
no-dtls
no-multicast-peers
min-port=49160
max-port=49200
log-file=stdout
verbose
```

Faixa de relay enxuta (40 portas) reduz superfície e consumo de RAM.
Sem TLS por enquanto (TLS exige cert válido — adicionar na fase 6 se necessário).

### 5.3 Firewall Hostinger (você libera)

| Porta            | Protocolo | Direção  | Função                    |
|------------------|-----------|----------|---------------------------|
| 3478             | UDP       | inbound  | Sinalização TURN          |
| 3478             | TCP       | inbound  | Fallback TCP TURN         |
| 49160-49200      | UDP       | inbound  | Relay de mídia            |

No painel Hostinger: **VPS → Firewall → Add rule** (ou `ufw allow 3478/udp`, etc).

### 5.4 DNS

Subdomínio dedicado: `turn.ametista.braviaglobal.com.br` apontando pro mesmo IP da VPS (registro A).

---

## 6. Fases de entrega

Cada fase = 1 commit/push, testável de forma independente.

### Fase 1 — Pricing global + tipo de consulta (1 commit)
**Arquivos:**
- `backend/migrations/2026-05-03_pricing_and_consultation_kind.sql` (novo)
- `backend/src/database/entities/system-setting.entity.ts` (novo)
- `backend/src/database/entities/consultation.entity.ts` (+`kind`)
- `backend/src/billing/billing.service.ts` (lê preço de settings)
- `backend/src/admin/admin.controller.ts` (+`GET/PUT /admin/pricing`)
- `backend/src/chat/chat.service.ts` (`startConsultation` recebe `kind`)
- `backend/src/chat/chat.gateway.ts` (`call-consultant` carrega `kind`)
- `frontend/app/consultor/[id]/page.tsx` (3 botões com preços diferentes, fetch /api/pricing público)
- `frontend/app/admin/pricing/page.tsx` (novo, admin edita os 3 preços)
- `backend/src/auth/...` endpoint público `GET /api/pricing` (sem auth, retorna os 3 valores)

**Aceitação:** admin edita preços; cliente vê 3 botões com preços corretos; ao iniciar consulta o billing usa o preço certo. Voz/vídeo abrem tela "em construção" (sem WebRTC ainda).

**Tempo estimado:** 1 dia.

### Fase 2 — Sinalização backend + endpoint ICE servers (1 commit)
**Arquivos:**
- `backend/src/chat/chat.gateway.ts` (+5 eventos webrtc-*)
- `backend/src/webrtc/webrtc.module.ts` (novo)
- `backend/src/webrtc/webrtc.controller.ts` (novo, `/api/webrtc/ice-servers`)
- `backend/src/webrtc/webrtc.service.ts` (gera credenciais HMAC)
- `backend/src/app.module.ts` (registra WebrtcModule)
- ENV: `TURN_SHARED_SECRET`, `TURN_HOST` (default placeholder)

**Aceitação:** chamadas socket entre 2 clientes autenticados retransmitem offer/answer/ice; `/api/webrtc/ice-servers` retorna STUN público + (eventualmente) TURN. Sem UI ainda.

**Tempo estimado:** meio dia.

### Fase 3 — Voz (frontend audio-only) (1 commit)
**Arquivos:**
- `frontend/lib/webrtc/peer-connection.ts` (novo, wrapper de RTCPeerConnection)
- `frontend/lib/webrtc/use-call.ts` (hook React encapsulando handshake)
- `frontend/app/call/[id]/page.tsx` (novo, modos chat/voice)
- `frontend/app/chat/[id]/page.tsx` → redirect 301 para `/call/[id]?kind=chat`
- `frontend/app/consultant-call/[id]/page.tsx` (novo)

**Aceitação:** voz bidirecional funciona em LAN/redes simples; mute/unmute; reconexão básica. Sem TURN — pode falhar em redes com NAT simétrico.

**Tempo estimado:** 1.5 dias.

### Fase 4 — coturn no docker-compose + credenciais (1 commit)
**Arquivos:**
- `docker-compose.yml` (+ serviço `coturn`)
- `coturn/turnserver.conf` (novo)
- `backend/src/webrtc/webrtc.service.ts` (gera URL TURN com credenciais TTL)
- `docs/turn-setup.md` (passo-a-passo de portas Hostinger e DNS)

**Aceitação:** voz funciona em qualquer rede (testado de 4G + WiFi corporativo).

**Tempo estimado:** meio dia + tempo de você abrir as portas e fazer o DNS.

### Fase 5 — Vídeo (1 commit)
**Arquivos:**
- `frontend/lib/webrtc/use-call.ts` (+stream de vídeo)
- `frontend/app/call/[id]/page.tsx` (layout vídeo)
- `frontend/app/consultant-call/[id]/page.tsx` (idem)

**Aceitação:** vídeo bidirecional, toggle câmera, swap front/back no mobile.

**Tempo estimado:** 1.5 dias.

---

## 7. Riscos e mitigações

| Risco                                     | Mitigação                                          |
|-------------------------------------------|---------------------------------------------------|
| Hostinger bloquear UDP 49160-49200        | Confirmar abertura na Fase 4; fallback TCP 3478   |
| coturn consumir muita RAM                 | `total-quota=100` limita conexões concorrentes    |
| Mobile Safari quebrar getUserMedia        | Testar iOS Safari na Fase 3; usar `playsInline`   |
| Admin sem proteção dos preços             | Endpoint admin já tem `JwtAuthGuard + role admin` |
| Race condition `kind` vs preço (admin muda no meio da call) | `consultation.kind` + preço lido **uma vez** no startConsultation, snapshot armazenado |

> **Snapshot de preço (proteção contra mudança no meio):** vou adicionar coluna
> `consultations.priceSnapshot numeric(10,2)` setada no `startConsultation`.
> Billing usa esse snapshot, não o preço atual. Se admin mudar o preço durante
> a chamada, só afeta consultas futuras.

---

## 8. Comissão (já existe, sem mudança)

`consultants.commissionPercent` continua como está (default 50). Por consultor.
Admin pode editar via futura UI ou direto no DB. Earnings = `creditsUsed * commissionPercent / 100`.

---

## 9. Resumo das ENVs novas

```
TURN_SHARED_SECRET=<gerado com openssl rand -hex 32>
TURN_HOST=turn.ametista.braviaglobal.com.br
```

Adicionar no Dokploy (env do serviço backend) **antes** do deploy da Fase 2.

---

## 10. Ordem de execução proposta

1. Você aprova esse plano.
2. Eu mando **Fase 1**, você testa preços + 3 botões + admin.
3. Você abre as portas no firewall + cria DNS `turn.ametista.braviaglobal.com.br` + gera o `TURN_SHARED_SECRET` no Dokploy.
4. Eu mando **Fase 2 + 3 + 4** juntas (não fazem sentido separadas — sem coturn voz não funciona em prod).
5. Você testa voz entre redes diferentes.
6. Eu mando **Fase 5** (vídeo).

Total estimado: ~5 dias úteis de trabalho meu + ações pontuais suas (firewall, DNS, env).
