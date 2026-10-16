-- PrépaBAC Mauritanie — persistance de la progression (Neon / PostgreSQL).
-- Idempotent : à lancer avec `npm run db:setup` après avoir défini DATABASE_URL dans .env.local.
-- Le device_id est l'identifiant stable stocké dans localStorage par chaque appareil ;
-- un élève qui change de navigateur retrouve sa progression en saisissant le même identifiant
-- (l'app le génère une fois et le réutilise ensuite).

CREATE TABLE IF NOT EXISTS progress (
  device_id           text PRIMARY KEY,
  profile             jsonb  NOT NULL DEFAULT '{}'::jsonb,
  completed_chapters  text[] NOT NULL DEFAULT '{}'::text[],
  completed_exercises text[] NOT NULL DEFAULT '{}'::text[],
  completed_sessions  text[] NOT NULL DEFAULT '{}'::text[],
  attempts            jsonb  NOT NULL DEFAULT '{}'::jsonb,
  streak              integer NOT NULL DEFAULT 0,
  last_study          date,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Filets de sécurité côté base : les valeurs arrivent du client, l'API assainit déjà,
-- mais une contrainte évite d'écrire un streak aberrant depuis un autre point d'entrée.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'progress'::regclass AND contype = 'c'
                 AND pg_get_constraintdef(oid) LIKE '%streak%') THEN
    ALTER TABLE progress ADD CONSTRAINT progress_streak_range CHECK (streak >= 0 AND streak <= 3650);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS progress_updated_at_idx ON progress (updated_at DESC);
