-- Adds self-declared availability status for consultants.
-- Idempotent — safe to re-run on any environment.
-- TypeORM `synchronize: true` will also create these columns on first boot
-- after the entity update, but this script is the safety net for environments
-- where synchronize is disabled or already drifted.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultants' AND column_name = 'availabilityStatus'
  ) THEN
    ALTER TABLE consultants
      ADD COLUMN "availabilityStatus" varchar(32) NOT NULL DEFAULT 'offline';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultants' AND column_name = 'busySince'
  ) THEN
    ALTER TABLE consultants
      ADD COLUMN "busySince" timestamptz NULL;
  END IF;
END $$;

-- Reset stale "in_consultation"/"busy" rows (e.g. from crashed sessions before
-- this column existed). Safe to run repeatedly — it never zeros healthy data.
UPDATE consultants
SET "availabilityStatus" = 'offline', "busySince" = NULL
WHERE "availabilityStatus" IN ('in_consultation', 'busy', 'online');
