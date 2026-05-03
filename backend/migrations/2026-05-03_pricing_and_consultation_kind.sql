-- Fase 1 WebRTC: pricing global + tipo de consulta
-- 1) tabela de configurações key/value (preços globais agora; outras chaves no futuro)
CREATE TABLE IF NOT EXISTS system_settings (
  "key"        varchar(64)   PRIMARY KEY,
  "value"      numeric(10,2) NOT NULL,
  "updatedAt"  timestamptz   NOT NULL DEFAULT now()
);

-- defaults: R$1 chat / R$3 voz / R$5 vídeo
INSERT INTO system_settings ("key", "value") VALUES
  ('price_chat_per_min',  1.00),
  ('price_voice_per_min', 3.00),
  ('price_video_per_min', 5.00)
ON CONFLICT ("key") DO NOTHING;

-- 2) consultations.kind + priceSnapshot
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS "kind" varchar(16) NOT NULL DEFAULT 'chat';
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS "priceSnapshot" numeric(10,2);

-- backfill snapshot pra consultas existentes (usa pricePerMinute do consultor; chat = único tipo até hoje)
UPDATE consultations c
   SET "priceSnapshot" = co."pricePerMinute"
  FROM consultants co
 WHERE c."consultantId" = co.id
   AND c."priceSnapshot" IS NULL;
