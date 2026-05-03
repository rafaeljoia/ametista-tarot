-- Estende service_orders para suportar oferendas (banho/oração) com prazo, entrega e expiração.
-- Cria tabela inbox_messages para entregar mensagens da plataforma ao cliente.
-- Cria settings de prazo (horas) das oferendas.

-- 1) Estender service_orders ----------------------------------------------------------------

ALTER TABLE service_orders
  ALTER COLUMN "consultationId" DROP NOT NULL;

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS "requestMessage" text NULL,
  ADD COLUMN IF NOT EXISTS "deliveryText"  text NULL,
  ADD COLUMN IF NOT EXISTS "deadlineAt"    timestamptz NULL,
  ADD COLUMN IF NOT EXISTS "deliveredAt"   timestamptz NULL;

-- 2) Inbox interna do cliente ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inbox_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    uuid NOT NULL,
  kind        varchar(40) NOT NULL,
  title       varchar(200) NOT NULL,
  body        text NOT NULL,
  link        varchar(400) NULL,
  "readAt"    timestamptz NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inbox_messages_user_idx
  ON inbox_messages ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS inbox_messages_unread_idx
  ON inbox_messages ("userId") WHERE "readAt" IS NULL;

-- 3) Settings padrão ------------------------------------------------------------------------

INSERT INTO system_settings (key, value)
VALUES ('offering_deadline_hours', '24')
ON CONFLICT (key) DO NOTHING;
