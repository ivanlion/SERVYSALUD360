-- Migración SQL para agregar empresa_id a tablas existentes
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar empresa_id a tabla casos
ALTER TABLE casos 
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_casos_empresa_id ON casos(empresa_id);

-- 2. Agregar empresa_id a tabla registros_trabajadores
ALTER TABLE registros_trabajadores 
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_registros_trabajadores_empresa_id ON registros_trabajadores(empresa_id);

-- 3. Agregar empresa_id a tabla examenes_medicos (si existe)
-- Si la tabla no existe, se puede crear después
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'examenes_medicos') THEN
    ALTER TABLE examenes_medicos 
    ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_examenes_medicos_empresa_id ON examenes_medicos(empresa_id);
  END IF;
END $$;

-- 4. Actualizar registros existentes (opcional)
-- Si ya tienes datos, puedes asignarlos a una empresa por defecto
-- UPDATE casos SET empresa_id = (SELECT id FROM empresas LIMIT 1) WHERE empresa_id IS NULL;
-- UPDATE registros_trabajadores SET empresa_id = (SELECT id FROM empresas LIMIT 1) WHERE empresa_id IS NULL;

