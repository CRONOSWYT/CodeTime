-- Schema para CodeTime
-- Tabla unificada para tarjetas de todos los lenguajes

CREATE TABLE cards (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  titulo VARCHAR(255) NOT NULL CHECK (LENGTH(titulo) > 0),
  descripcion TEXT,
  contenido TEXT,
  language VARCHAR(50) NOT NULL,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX cards_language_idx ON cards(language);
CREATE INDEX cards_user_id_idx ON cards(user_id);

-- Tabla para lenguajes
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