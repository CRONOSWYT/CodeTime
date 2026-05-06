-- Schema para CodeTime
-- Normalización: roles, perfiles, y likes

CREATE TABLE roles (
  id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  PRIMARY KEY (id)
);

CREATE TABLE perfiles (
  id UUID NOT NULL,
  username TEXT NOT NULL UNIQUE,
  role_id BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE languages (
  id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(100),
  element_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  user_id UUID,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE cards (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  titulo VARCHAR(255) NOT NULL CHECK (LENGTH(titulo) > 0),
  descripcion TEXT,
  contenido TEXT,
  language VARCHAR(50) NOT NULL,
  language_id BIGINT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE likes_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (card_id, user_id)
);

CREATE TABLE likes_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  language_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (language_id, user_id)
);

CREATE TABLE reports (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('language', 'card', 'user')),
  target_id TEXT NOT NULL,
  target_name TEXT,
  target_owner_id UUID,
  reporter_id UUID NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'resuelto', 'rechazado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_owner_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX reports_reporter_id_idx ON reports(reporter_id);
CREATE INDEX reports_entity_type_idx ON reports(entity_type);
CREATE INDEX reports_target_id_idx ON reports(target_id);

CREATE INDEX cards_language_idx ON cards(language);
CREATE INDEX cards_language_id_idx ON cards(language_id);
CREATE INDEX cards_user_id_idx ON cards(user_id);

CREATE INDEX likes_cards_card_id_idx ON likes_cards(card_id);
CREATE INDEX likes_cards_user_id_idx ON likes_cards(user_id);
CREATE INDEX likes_languages_language_id_idx ON likes_languages(language_id);
CREATE INDEX likes_languages_user_id_idx ON likes_languages(user_id);

INSERT INTO roles (name, description) VALUES
  ('usuario', 'Rol estándar para los usuarios'),
  ('administrador', 'Rol con acceso a administración');