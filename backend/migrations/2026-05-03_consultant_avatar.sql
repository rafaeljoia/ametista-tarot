-- Adiciona coluna avatarUrl em consultants. Idempotente (IF NOT EXISTS).
-- Aplique uma vez na VPS antes de redeployar:
--   docker exec -i <postgres_container> psql -U postgres -d ametista_tarot < 2026-05-03_consultant_avatar.sql

ALTER TABLE consultants
  ADD COLUMN IF NOT EXISTS "avatarUrl" text;
