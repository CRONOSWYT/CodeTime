-- Schema para CodeTime
-- Tabla unificada para tarjetas de todos los lenguajes

CREATE TABLE public.cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo character varying NOT NULL CHECK (length(titulo::text) > 0),
  descripcion text,
  contenido text,
  language text NOT NULL,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cards_pkey PRIMARY KEY (id),
  CONSTRAINT cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS cards_language_idx ON cards(language);
CREATE INDEX IF NOT EXISTS cards_user_id_idx ON cards(user_id);

-- Tabla para lenguajes
CREATE TABLE public.languages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  url text,
  element_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT languages_pkey PRIMARY KEY (id),
  CONSTRAINT languages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);