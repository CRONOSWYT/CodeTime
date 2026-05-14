CREATE  if NOT EXISTS TABLE roles (
  id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  PRIMARY KEY (id)
);

CREATE if NOT EXISTS TABLE perfiles (
  id UUID NOT NULL,
  username TEXT NOT NULL UNIQUE,
  role_id BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE if NOT EXISTS TABLE languages (
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

CREATE if NOT EXISTS TABLE cards (
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

CREATE if NOT EXISTS TABLE likes_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (card_id, user_id)
);

CREATE if NOT EXISTS TABLE likes_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  language_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (language_id, user_id)
);

CREATE if NOT EXISTS TABLE reports (
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

CREATE if NOT EXISTS TABLE audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id TEXT,
  page_url TEXT,
  user_agent TEXT,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_entity_type_idx ON audit_logs(entity_type);
CREATE INDEX audit_logs_action_type_idx ON audit_logs(action_type);
CREATE INDEX audit_logs_created_at_idx ON audit_logs(created_at);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

INSERT INTO roles (name, description) VALUES
  ('usuario', 'Rol estándar para los usuarios'),
  ('administrador', 'Rol con acceso a administración'),
  ('dueño', 'Rol de propietario con control total');



















































  -- Schema para CodeTime
-- Normalización: roles, perfiles, y likes

CREATE if NOT EXISTS TABLE roles ( -- Crear tabla de roles
  id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL, -- ID automático único
  name VARCHAR(50) NOT NULL UNIQUE, -- Nombre del rol único
  description TEXT, -- Descripción del rol
  PRIMARY KEY (id) -- Clave primaria
);

CREATE if NOT EXISTS TABLE perfiles ( -- Crear tabla de perfiles de usuarios
  id UUID NOT NULL, -- ID del usuario
  username TEXT NOT NULL UNIQUE, -- Nombre de usuario único
  role_id BIGINT NOT NULL DEFAULT 1, -- Rol asignado por defecto
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Fecha de creación
  PRIMARY KEY (id), -- Clave primaria
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE, -- Relación con auth.users
  FOREIGN KEY (role_id) REFERENCES roles(id) -- Relación con roles
);

CREATE if NOT EXISTS TABLE languages ( -- Crear tabla de lenguajes/categorías
  id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL, -- ID automático
  name VARCHAR(100) NOT NULL UNIQUE, -- Nombre único del lenguaje
  description TEXT, -- Descripción del lenguaje
  icon VARCHAR(100), -- Icono del lenguaje
  element_count INTEGER DEFAULT 0, -- Cantidad de elementos
  is_active BOOLEAN DEFAULT TRUE, -- Estado activo/inactivo
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), -- Fecha de creación
  user_id UUID, -- Usuario creador
  PRIMARY KEY (id), -- Clave primaria
  FOREIGN KEY (user_id) REFERENCES auth.users(id) -- Relación con usuarios
);

CREATE if NOT EXISTS TABLE cards ( -- Crear tabla de tarjetas/publicaciones
  id UUID NOT NULL DEFAULT gen_random_uuid(), -- ID único automático
  titulo VARCHAR(255) NOT NULL CHECK (LENGTH(titulo) > 0), -- Título obligatorio
  descripcion TEXT, -- Descripción de la tarjeta
  contenido TEXT, -- Contenido principal
  language VARCHAR(50) NOT NULL, -- Nombre del lenguaje
  language_id BIGINT, -- ID del lenguaje relacionado
  user_id UUID, -- Usuario creador
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Fecha de creación
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Fecha de actualización
  PRIMARY KEY (id), -- Clave primaria
  FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE SET NULL, -- Relación con languages
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE -- Relación con usuarios
);

CREATE if NOT EXISTS TABLE likes_cards ( -- Tabla de likes para tarjetas
  id UUID NOT NULL DEFAULT gen_random_uuid(), -- ID único automático
  card_id UUID NOT NULL, -- ID de la tarjeta
  user_id UUID NOT NULL, -- ID del usuario
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Fecha del like
  PRIMARY KEY (id), -- Clave primaria
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE, -- Relación con cards
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE, -- Relación con usuarios
  UNIQUE (card_id, user_id) -- Evitar likes duplicados
);

CREATE if NOT EXISTS TABLE likes_languages ( -- Tabla de likes para lenguajes
  id UUID NOT NULL DEFAULT gen_random_uuid(), -- ID único automático
  language_id BIGINT NOT NULL, -- ID del lenguaje
  user_id UUID NOT NULL, -- ID del usuario
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Fecha del like
  PRIMARY KEY (id), -- Clave primaria
  FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE CASCADE, -- Relación con languages
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE, -- Relación con usuarios
  UNIQUE (language_id, user_id) -- Evitar likes duplicados
);

CREATE if NOT EXISTS TABLE reports ( -- Tabla de reportes
  id UUID NOT NULL DEFAULT gen_random_uuid(), -- ID único automático
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('language', 'card', 'user')), -- Tipo de entidad reportada
  target_id TEXT NOT NULL, -- ID del objetivo reportado
  target_name TEXT, -- Nombre del objetivo
  target_owner_id UUID, -- Dueño del contenido reportado
  reporter_id UUID NOT NULL, -- Usuario que reporta
  description TEXT NOT NULL, -- Motivo del reporte
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'resuelto', 'rechazado')), -- Estado del reporte
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Fecha del reporte
  PRIMARY KEY (id), -- Clave primaria
  FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE, -- Relación con el usuario reportador
  FOREIGN KEY (target_owner_id) REFERENCES auth.users(id) ON DELETE SET NULL -- Relación con el dueño del contenido
);