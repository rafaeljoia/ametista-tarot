-- ============================================================================
-- Ametista Tarot — Drop polymorphic FKs from `messages`
-- Data: 2026-05-02
-- Motivo:
--   `messages.senderId` e `messages.recipientId` são UUIDs polimórficos que
--   podem apontar para `users(id)` (cliente) OU `consultants(id)` (consultor)
--   dependendo da direção da mensagem. As FKs físicas criadas pelo TypeORM
--   (`@ManyToOne(() => User)` em sender, `@ManyToOne(() => Consultant)` em
--   recipient) só permitiam o caminho cliente→consultor; mensagens enviadas
--   pelo CONSULTOR sempre falhavam com:
--     QueryFailedError: insert or update on table "messages" violates
--     foreign key constraint "FK_2db9cf2b3ca111742793f6c37ce"
--
-- A correção definitiva está no código (message.entity.ts agora declara
-- `createForeignKeyConstraints: false` em ambas as relações). Este SQL é
-- IDEMPOTENTE e remove qualquer FK existente em senderId / recipientId,
-- preservando a FK de consultationId (essa está correta — consultations é
-- uma única tabela).
--
-- COMO RODAR (Postgres do container Dokploy, antes do redeploy do backend):
--   psql "$DATABASE_URL" -f 2026-05-02_drop_messages_polymorphic_fks.sql
-- ou via Dokploy → Postgres → SQL editor.
-- ============================================================================

DO $$
DECLARE
  c_name text;
BEGIN
  FOR c_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class      cl ON cl.oid = con.conrelid
    JOIN pg_namespace  ns ON ns.oid = cl.relnamespace
    JOIN pg_attribute  a  ON a.attrelid = cl.oid
                          AND a.attnum  = ANY (con.conkey)
    WHERE cl.relname  = 'messages'
      AND ns.nspname  = current_schema()
      AND con.contype = 'f'
      AND a.attname   IN ('senderId', 'recipientId')
  LOOP
    RAISE NOTICE 'Dropping FK on messages: %', c_name;
    EXECUTE format('ALTER TABLE messages DROP CONSTRAINT %I', c_name);
  END LOOP;
END
$$;

-- Verificação: lista as FKs restantes em `messages`. Esperado: apenas a FK
-- de consultationId (algo como FK_*** REFERENCES consultations(id)).
SELECT
  con.conname                       AS constraint_name,
  pg_get_constraintdef(con.oid)     AS definition
FROM pg_constraint con
JOIN pg_class cl ON cl.oid = con.conrelid
WHERE cl.relname = 'messages'
  AND con.contype = 'f';
