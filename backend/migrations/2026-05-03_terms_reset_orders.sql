-- ============================================================================
-- Termos de Uso, redefinição de senha, ordens de serviço extra (banhos/orações)
-- e novas chaves em system_settings (oferta pós-atendimento + email).
-- Idempotente: pode rodar várias vezes sem efeito colateral.
-- ============================================================================

-- 1) terms_versions
CREATE TABLE IF NOT EXISTS terms_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version int NOT NULL UNIQUE,
  content text NOT NULL,
  "isActive" boolean NOT NULL DEFAULT false,
  "publishedBy" uuid,
  "publishedByName" varchar(200),
  "publishedAt" timestamptz NOT NULL DEFAULT now()
);

-- Garante que existe ao menos a v1 ativa, com o texto fornecido pelo cliente
INSERT INTO terms_versions (version, content, "isActive", "publishedByName")
SELECT 1, $$# TERMOS DE USO — PLATAFORMA DE ATENDIMENTO ONLINE TAROT

Última atualização: Maio de 2026

Bem-vindo à plataforma de atendimento online Tarot.

Os presentes Termos de Uso regulam o acesso e utilização da plataforma, incluindo serviços de chat, voz, vídeo, consultas online, cobranças por minuto, pagamentos e demais funcionalidades disponibilizadas aos usuários e consultores.

Ao acessar ou utilizar a plataforma, o usuário declara ter lido, compreendido e concordado integralmente com estes Termos de Uso.

Caso não concorde com qualquer condição aqui estabelecida, não utilize a plataforma.

---

## 1. OBJETO DA PLATAFORMA

A plataforma disponibiliza um ambiente digital para intermediação de atendimentos online realizados por consultores independentes, podendo incluir:

- Chat online
- Atendimento por voz
- Atendimento por vídeo
- Consulta por e-mail
- Atendimento com cobrança por minuto
- Compra de créditos
- Sistema de avaliações
- Programas promocionais
- Recursos multimídia e interativos

A plataforma atua exclusivamente como intermediadora tecnológica entre usuários e consultores.

---

## 2. NATUREZA DOS SERVIÇOS

Os serviços oferecidos possuem caráter recreativo, espiritual, esotérico, de entretenimento e aconselhamento não profissional.

Os atendimentos NÃO substituem aconselhamento médico, suporte psicológico, orientação jurídica ou consultoria financeira, nem constituem promessa de resultado.

As informações fornecidas pelos consultores representam opiniões pessoais e interpretações subjetivas.

---

## 3. CADASTRO DE USUÁRIOS

Ao realizar cadastro, o usuário declara possuir capacidade legal, fornecer informações verdadeiras, manter seus dados atualizados e ser responsável pelas atividades realizadas em sua conta.

O compartilhamento de credenciais é proibido.

A plataforma poderá suspender ou excluir contas em caso de fraude, uso indevido, comportamento abusivo ou violação destes termos.

---

## 4. ATENDIMENTOS E COBRANÇA POR MINUTO

Os atendimentos podem possuir cobrança baseada em tempo de conexão, minutos consumidos, modalidade do atendimento e valores definidos pelos consultores.

Ao iniciar um atendimento, o usuário concorda com início automático da cobrança, consumo proporcional de créditos e encerramento automático quando os créditos forem insuficientes.

---

## 5. CRÉDITOS, PAGAMENTOS E RECARGAS

A plataforma poderá disponibilizar compra de créditos, assinaturas, promoções, bônus e programas de fidelidade.

Os pagamentos podem ocorrer via PIX, cartão de crédito, carteiras digitais e gateways parceiros. Após a confirmação do pagamento, os créditos serão disponibilizados conforme regras da plataforma.

---

## 6. POLÍTICA DE REEMBOLSO

Por se tratar de serviço digital consumido em tempo real, atendimentos já realizados não são reembolsáveis e minutos consumidos não poderão ser estornados. Créditos promocionais podem possuir validade específica.

Solicitações de reembolso serão analisadas individualmente conforme legislação aplicável.

---

## 7. RESPONSABILIDADE DOS CONSULTORES

Os consultores são integralmente responsáveis pelos conteúdos transmitidos, opiniões emitidas, atendimentos realizados e informações fornecidas aos usuários.

A plataforma não garante precisão das consultas, resultados específicos, previsões futuras ou satisfação subjetiva do usuário.

---

## 8. CONDUTAS PROIBIDAS

É proibido utilizar linguagem ofensiva, praticar assédio, compartilhar conteúdo ilegal, gravar atendimentos sem autorização, utilizar a plataforma para fraudes, tentar manipular pagamentos ou créditos e divulgar contatos externos para burlar a plataforma.

Usuários ou consultores que violem estas regras poderão ter acesso suspenso permanentemente.

---

## 9. CONTEÚDOS E PRIVACIDADE

A plataforma poderá armazenar registros técnicos, logs de acesso, mensagens, histórico de transações e dados operacionais.

O tratamento dos dados seguirá a legislação aplicável e a Política de Privacidade da plataforma.

---

## 10. DISPONIBILIDADE DOS SERVIÇOS

A plataforma poderá passar por manutenção, atualizações, interrupções técnicas e melhorias de infraestrutura. Não garantimos funcionamento ininterrupto ou livre de falhas.

---

## 11. PROPRIEDADE INTELECTUAL

Todo o sistema, tecnologia, identidade visual, software, design e funcionalidades pertencem à plataforma e são protegidos por legislação de propriedade intelectual.

É proibido copiar, reproduzir, modificar, revender ou explorar comercialmente qualquer parte da plataforma sem autorização formal.

---

## 12. LIMITAÇÃO DE RESPONSABILIDADE

A plataforma não será responsável por decisões tomadas pelos usuários, interpretações pessoais, perdas financeiras, danos indiretos, indisponibilidade causada por terceiros, falhas de internet ou condutas dos consultores.

O uso da plataforma ocorre por conta e risco do usuário.

---

## 13. CANCELAMENTO E SUSPENSÃO

A plataforma poderá bloquear contas, suspender atendimentos, cancelar créditos obtidos irregularmente, remover conteúdos e encerrar acessos em casos de fraude, violação destes termos, suspeita de atividades ilícitas ou comportamento abusivo.

---

## 14. ALTERAÇÕES DOS TERMOS

Os presentes Termos de Uso poderão ser modificados a qualquer momento. A continuidade de utilização da plataforma após alterações será interpretada como concordância automática com os novos termos.

---

## 15. LEGISLAÇÃO E FORO

Os presentes Termos serão regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede da plataforma para resolução de quaisquer conflitos, com renúncia a qualquer outro foro.

---

## 16. DECLARAÇÃO FINAL

Ao utilizar a plataforma, o usuário declara possuir idade legal para contratação, compreender a natureza recreativa e subjetiva dos atendimentos e concordar integralmente com estes Termos de Uso.

O uso contínuo da plataforma representa aceitação integral destas condições.
$$, true, 'sistema'
WHERE NOT EXISTS (SELECT 1 FROM terms_versions WHERE version = 1);

-- 2) terms_acceptances
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "userName" varchar(200),
  "userEmail" varchar(320),
  "termsVersionId" uuid NOT NULL,
  "termsVersion" int NOT NULL,
  ip varchar(64),
  "userAgent" varchar(500),
  "acceptedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user ON terms_acceptances ("userId");
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_version ON terms_acceptances ("termsVersionId");

-- 3) password_reset_tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role varchar(20) NOT NULL,
  "userId" uuid NOT NULL,
  email varchar(320) NOT NULL,
  "tokenHash" varchar(128) NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "usedAt" timestamptz,
  "requestedFromIp" varchar(64),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens ("userId");
CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens ("tokenHash");

-- 4) service_orders
CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "consultationId" uuid NOT NULL,
  "clientId" uuid NOT NULL,
  "clientName" varchar(200) NOT NULL,
  "clientEmail" varchar(320) NOT NULL,
  "consultantId" uuid NOT NULL,
  "consultantName" varchar(200) NOT NULL,
  "consultantEmail" varchar(320),
  kind varchar(32) NOT NULL DEFAULT 'blessing',
  "priceCredits" decimal(10, 2) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  notes text,
  "sentAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_so_client ON service_orders ("clientId");
CREATE INDEX IF NOT EXISTS idx_so_consultant ON service_orders ("consultantId");
CREATE INDEX IF NOT EXISTS idx_so_consultation ON service_orders ("consultationId");

-- 5) seed system_settings — oferta pós-atendimento (banhos/orações)
INSERT INTO system_settings (key, value)
VALUES ('post_call_offer_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value)
VALUES ('post_call_offer_price', '5')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value)
VALUES ('post_call_offer_text',
  'Por apenas R$ {{price}}, você pode receber indicação de banhos e orações. A atendente {{consultant}} pode preparar e enviar diretamente no seu e-mail.')
ON CONFLICT (key) DO NOTHING;
