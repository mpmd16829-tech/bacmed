-- PrépaBAC Mauritanie — schéma complet (Neon / PostgreSQL).
-- Idempotent : `npm run db:setup` puis `npm run db:seed` (le seed n'écrase pas les lignes éditées).
-- Les champs `*_jsonb` de texte portent { "fr": "...", "ar": "..." } ; les listes portent [{fr,ar}].

-- ------------------------------------------------------------------ progression
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

-- Filet de sécurité : l'API assainit déjà, la contrainte protège les autres points d'entrée.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'progress'::regclass AND contype = 'c'
                 AND pg_get_constraintdef(oid) LIKE '%streak%') THEN
    ALTER TABLE progress ADD CONSTRAINT progress_streak_range CHECK (streak >= 0 AND streak <= 3650);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS progress_updated_at_idx ON progress (updated_at DESC);

-- ------------------------------------------------------------------ contenu (cours & exercices)
CREATE TABLE IF NOT EXISTS subjects (
  id         text PRIMARY KEY,
  name       jsonb NOT NULL DEFAULT '{}'::jsonb,
  short      text NOT NULL DEFAULT '',
  position   integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Une matière appartient à une ou plusieurs filières, avec un coefficient propre à chacune.
CREATE TABLE IF NOT EXISTS stream_subjects (
  stream_id   text NOT NULL,
  subject_id  text NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  coefficient integer NOT NULL DEFAULT 1,
  position    integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stream_id, subject_id)
);

CREATE TABLE IF NOT EXISTS chapters (
  id            text PRIMARY KEY,
  subject_id    text NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title         jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary       jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration      integer NOT NULL DEFAULT 40,
  prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
  objectives    jsonb NOT NULL DEFAULT '[]'::jsonb,
  essentials    jsonb NOT NULL DEFAULT '[]'::jsonb,
  method        jsonb NOT NULL DEFAULT '[]'::jsonb,
  example       jsonb NOT NULL DEFAULT '{}'::jsonb,
  mistakes      jsonb NOT NULL DEFAULT '[]'::jsonb,
  recap         jsonb NOT NULL DEFAULT '{}'::jsonb,
  position      integer NOT NULL DEFAULT 0,
  published     boolean NOT NULL DEFAULT true,
  source        text NOT NULL DEFAULT 'seed',
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercises (
  id         text PRIMARY KEY,
  chapter_id text NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  difficulty integer NOT NULL DEFAULT 1,
  duration   integer NOT NULL DEFAULT 10,
  question   jsonb NOT NULL DEFAULT '{}'::jsonb,
  hint       jsonb NOT NULL DEFAULT '{}'::jsonb,
  answer     jsonb NOT NULL DEFAULT '{}'::jsonb,
  correction jsonb NOT NULL DEFAULT '{}'::jsonb,
  position   integer NOT NULL DEFAULT 0,
  published  boolean NOT NULL DEFAULT true,
  source     text NOT NULL DEFAULT 'seed',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chapters_subject_idx ON chapters (subject_id, position);
CREATE INDEX IF NOT EXISTS exercises_chapter_idx ON exercises (chapter_id, position);

-- ------------------------------------------------------------------ coach de révision
CREATE TABLE IF NOT EXISTS coach_tips (
  id         text PRIMARY KEY,
  keywords   text[] NOT NULL DEFAULT '{}',
  answer     jsonb NOT NULL DEFAULT '{}'::jsonb,
  subject_id text,
  priority   integer NOT NULL DEFAULT 0,
  published  boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------ comptes
-- Code élève : saisit sur un nouvel appareil pour retrouver et fusionner sa progression.
CREATE TABLE IF NOT EXISTS students (
  code         text PRIMARY KEY,
  device_id    text,
  profile      jsonb NOT NULL DEFAULT '{}'::jsonb,
  teacher_code text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS students_device_key ON students (device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS students_teacher_idx ON students (teacher_code) WHERE teacher_code IS NOT NULL;

-- Code enseignant : créé par la console, donne lecture des progrès des élèves rattachés.
CREATE TABLE IF NOT EXISTS teachers (
  code        text PRIMARY KEY,
  label       text NOT NULL,
  subject_ids text[] NOT NULL DEFAULT '{}',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Réglages applicatifs : empreinte du PIN superadmin, version du contenu, etc.
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE progress ADD COLUMN IF NOT EXISTS student_code text;
CREATE INDEX IF NOT EXISTS progress_student_code_idx ON progress (student_code) WHERE student_code IS NOT NULL;
