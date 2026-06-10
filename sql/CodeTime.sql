BEGIN;

/* Habilitar función de generación de UUIDs (pgcrypto) en PostgreSQL */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/* Roles (tabla de referencia para permisos) */
CREATE TABLE IF NOT EXISTS roles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
);

/* Perfiles de usuarios. El id corresponde al UUID de auth.users (Supabase) */
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  role_id BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

/* Lenguajes */
CREATE TABLE IF NOT EXISTS languages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

/* Tarjetas / publicaciones */
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(255) NOT NULL CHECK (LENGTH(titulo) > 0),
  descripcion TEXT,
  contenido TEXT,
  language VARCHAR(50) NOT NULL,
  language_id BIGINT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

/* Likes de tarjetas */
CREATE TABLE IF NOT EXISTS likes_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (card_id, user_id)
);

/* Likes de lenguajes */
CREATE TABLE IF NOT EXISTS likes_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (language_id, user_id)
);

/* Reseñas públicas */
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  comment TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

/* reporte de de lenguajes tarjetas etc */
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('language','card','user')),
  target_id TEXT NOT NULL,
  target_name TEXT,
  target_owner_id UUID,
  reporter_id UUID NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','resuelto','rechazado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_owner_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

/*  Auditoría */
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id TEXT,
  page_url TEXT,
  user_agent TEXT,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

/* Índices para rendimiento */
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_entity_type ON reports (entity_type);
CREATE INDEX IF NOT EXISTS idx_reports_target_id ON reports (target_id);
CREATE INDEX IF NOT EXISTS idx_cards_language_id ON cards (language_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards (user_id);
CREATE INDEX IF NOT EXISTS idx_likes_cards_card_id ON likes_cards (card_id);
CREATE INDEX IF NOT EXISTS idx_likes_cards_user_id ON likes_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_likes_languages_language_id ON likes_languages (language_id);
CREATE INDEX IF NOT EXISTS idx_likes_languages_user_id ON likes_languages (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

/* datos iniciales para roles */
INSERT INTO roles (name, description) VALUES
  ('usuario', 'Rol estándar para los usuarios'),
  ('administrador', 'Rol con acceso a administración'),
  ('dueño', 'Rol de propietario con control total')
ON CONFLICT (name) DO NOTHING;

COMMIT;
