# Setup do TURN (coturn) — Hostinger VPS

> Necessário para a Fase 2-4 do WebRTC. Sem TURN, voz/vídeo só funciona em
> redes "fáceis" (sem NAT simétrico). Em 4G/WiFi corporativo, falha sem TURN.

## 1. DNS

No painel do seu provedor de DNS, crie um registro **A**:

| Nome                                     | Tipo | Valor                  |
|------------------------------------------|------|------------------------|
| `turn.ametista.braviaglobal.com.br`      | A    | `<IP público da VPS>`  |

Aguarde propagação (`dig turn.ametista.braviaglobal.com.br` deve retornar o IP).

## 2. Firewall Hostinger

Abrir as portas no painel **VPS → Firewall** (ou via `ufw` se você administra direto):

| Porta            | Protocolo | Direção  | Função                    |
|------------------|-----------|----------|---------------------------|
| 3478             | UDP       | inbound  | Sinalização TURN          |
| 3478             | TCP       | inbound  | Fallback TCP TURN         |
| 49160-49200      | UDP       | inbound  | Relay de mídia            |

Via UFW:

```bash
ufw allow 3478/udp
ufw allow 3478/tcp
ufw allow 49160:49200/udp
```

## 3. Gerar o segredo TURN

```bash
openssl rand -hex 32
```

Guarde a saída — é o `TURN_SHARED_SECRET`.

## 4. Configurar variáveis no Dokploy

No serviço **backend** (NestJS), em **Environment**:

```
TURN_SHARED_SECRET=<saída do openssl rand>
TURN_HOST=turn.ametista.braviaglobal.com.br
```

> **Sem essas envs o backend continua funcionando** — só não emite credenciais
> TURN, retornando apenas STUN. Voz/vídeo passam a falhar fora da rede local.

## 5. Subir o coturn

O serviço já está declarado no `docker-compose.yml` da raiz do repo. Após
clonar o repo na VPS (ou fazer `git pull` na pasta do Dokploy), garanta que o
arquivo `coturn/turnserver.conf` foi gerado e suba:

```bash
docker compose up -d coturn
```

O entrypoint substitui `__REPLACED_AT_BOOT__` em `turnserver.conf` pelo valor
de `TURN_SHARED_SECRET` antes do boot do coturn.

## 6. Verificar

Do seu notebook:

```bash
# Deve responder pong
nc -uvz turn.ametista.braviaglobal.com.br 3478
```

Pelo navegador (com login no app), abra `https://ametista.braviaglobal.com.br/api/webrtc/ice-servers`
(com header `Authorization: Bearer <token>`). Resposta esperada:

```json
{
  "iceServers": [
    { "urls": ["stun:stun.l.google.com:19302"] },
    {
      "urls": ["turn:turn.ametista.braviaglobal.com.br:3478?transport=udp", "..."],
      "username": "1717000000:abc...",
      "credential": "base64=="
    }
  ],
  "ttl": 3600
}
```

Se `iceServers` veio só com STUN, as envs não estão chegando ao backend —
revise o painel Dokploy.

## 7. Teste de chamada real

1. Cliente em rede A (ex: 4G).
2. Consultor em rede B (ex: WiFi residencial).
3. Cliente abre o consultor → clica **Voz**.
4. Consultor aceita → áudio bidirecional.

Se a chamada conecta mas não sai áudio em ~10s, provável: porta UDP 3478 fechada
ou range 49160-49200 bloqueado. Confira o firewall.
