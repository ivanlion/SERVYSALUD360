-- ============================================================================
-- TABLA: analisis_emo_historial
-- ============================================================================
-- Almacena el historial de análisis de EMOs realizados con IA
-- Permite comparar análisis previos y hacer seguimiento de trabajadores
-- ============================================================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS analisis_emo_historial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  trabajador_dni VARCHAR(20),
  trabajador_nombre VARCHAR(255),
  archivo_nombre VARCHAR(255),
  archivo_url TEXT,
  fecha_analisis TIMESTAMPTZ DEFAULT NOW(),
  resultado_analisis JSONB,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_historial_empresa ON analisis_emo_historial(empresa_id);
CREATE INDEX IF NOT EXISTS idx_historial_trabajador ON analisis_emo_historial(trabajador_dni);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON analisis_emo_historial(fecha_analisis DESC);
CREATE INDEX IF NOT EXISTS idx_historial_usuario ON analisis_emo_historial(usuario_id);

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_historial_empresa_dni ON analisis_emo_historial(empresa_id, trabajador_dni);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_analisis_emo_historial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_analisis_emo_historial_updated_at ON analisis_emo_historial;
CREATE TRIGGER trigger_update_analisis_emo_historial_updated_at
  BEFORE UPDATE ON analisis_emo_historial
  FOR EACH ROW
  EXECUTE FUNCTION update_analisis_emo_historial_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE analisis_emo_historial ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver análisis de sus empresas
CREATE POLICY "Usuarios pueden ver análisis de sus empresas"
  ON analisis_emo_historial
  FOR SELECT
  USING (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden insertar análisis para sus empresas
CREATE POLICY "Usuarios pueden insertar análisis de sus empresas"
  ON analisis_emo_historial
  FOR INSERT
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden actualizar sus propios análisis
CREATE POLICY "Usuarios pueden actualizar sus análisis"
  ON analisis_emo_historial
  FOR UPDATE
  USING (
    usuario_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden eliminar sus propios análisis
CREATE POLICY "Usuarios pueden eliminar sus análisis"
  ON analisis_emo_historial
  FOR DELETE
  USING (
    usuario_id = auth.uid() AND
    empresa_id IN (
      SELECT empresa_id 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE analisis_emo_historial IS 'Historial de análisis de EMOs realizados con IA';
COMMENT ON COLUMN analisis_emo_historial.resultado_analisis IS 'JSONB con los resultados completos del análisis (csv_parseado, resumen_clinico, metadata)';
COMMENT ON COLUMN analisis_emo_historial.archivo_url IS 'URL del archivo en Supabase Storage o ruta relativa';


