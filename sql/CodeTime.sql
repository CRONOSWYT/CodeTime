-- ============================================
-- TABLA html - CODETIME
-- ============================================
CREATE TABLE IF NOT EXISTS html (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo varchar(255) unique NOT NULL,
  descripcion TEXT,
  contenido TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT titulo_not_empty CHECK (LENGTH(titulo) > 0)
);

===========================================
-- FUNCIÓN PARA updated_at AUTOMÁTICO
-- ============================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER updated_at
-- ============================================
DROP TRIGGER IF EXISTS trigger_actualizar_updated_at ON tarjetas;

CREATE TRIGGER trigger_actualizar_updated_at
BEFORE UPDATE ON tarjetas
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();