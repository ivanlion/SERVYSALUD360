-- ============================================
-- POLÍTICAS RLS PARA STORAGE BUCKET emos-pdf
-- ============================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → Storage → Policies
-- 2. O ejecuta este script en SQL Editor
-- 3. Esto permitirá a usuarios autenticados subir/descargar archivos
-- 
-- ============================================

-- Nota: Las políticas de Storage se crean directamente en el bucket
-- Si el bucket no existe, créalo primero desde Storage → Buckets

-- ============================================
-- VERSIÓN SIMPLE Y FUNCIONAL (RECOMENDADA)
-- ============================================
-- Esta versión permite a todos los usuarios autenticados
-- acceder al bucket emos-pdf. Es más simple y funciona mejor.

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Authenticated users can access emos-pdf bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files in emos-pdf bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to emos-pdf bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files in emos-pdf bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files from emos-pdf bucket" ON storage.objects;

-- Política única para todas las operaciones
CREATE POLICY "Authenticated users can access emos-pdf bucket"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'emos-pdf')
WITH CHECK (bucket_id = 'emos-pdf');

-- ============================================
-- VERSIÓN AVANZADA (Multi-tenancy por carpetas)
-- ============================================
-- Descomenta esto si quieres restricciones por empresa
-- (Requiere que los archivos estén en carpetas por empresa_id)

/*
-- POLÍTICA 1: SELECT (Descargar/Listar archivos)
CREATE POLICY "Users can view files in emos-pdf bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'emos-pdf'
  AND (
    -- Pueden ver archivos de su empresa (si el path incluye empresa_id)
    (storage.foldername(name))[1] IN (
      SELECT empresa_id::text 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
    -- O archivos en la carpeta 'general'
    OR (storage.foldername(name))[1] = 'general'
  )
);

-- POLÍTICA 2: INSERT (Subir archivos)
CREATE POLICY "Users can upload files to emos-pdf bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'emos-pdf'
  AND (
    -- Pueden subir a carpeta de su empresa
    (storage.foldername(name))[1] IN (
      SELECT empresa_id::text 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
    -- O a carpeta 'general' si no hay empresa seleccionada
    OR (storage.foldername(name))[1] = 'general'
  )
);

-- POLÍTICA 3: UPDATE (Actualizar archivos)
CREATE POLICY "Users can update files in emos-pdf bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'emos-pdf'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT empresa_id::text 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = 'general'
  )
)
WITH CHECK (
  bucket_id = 'emos-pdf'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT empresa_id::text 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = 'general'
  )
);

-- POLÍTICA 4: DELETE (Eliminar archivos)
CREATE POLICY "Users can delete files from emos-pdf bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'emos-pdf'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT empresa_id::text 
      FROM user_empresas 
      WHERE user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = 'general'
  )
);
*/

-- ============================================
-- ALTERNATIVA SIMPLE (Si las políticas anteriores fallan)
-- ============================================
-- Si las políticas con foldername no funcionan, usa esta versión más simple:

-- DROP POLICY IF EXISTS "Users can view files in emos-pdf bucket" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can upload files to emos-pdf bucket" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update files in emos-pdf bucket" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete files from emos-pdf bucket" ON storage.objects;

-- CREATE POLICY "Authenticated users can access emos-pdf bucket"
-- ON storage.objects FOR ALL
-- TO authenticated
-- USING (bucket_id = 'emos-pdf')
-- WITH CHECK (bucket_id = 'emos-pdf');

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esto para verificar las políticas creadas:

-- SELECT * FROM pg_policies 
-- WHERE tablename = 'objects' 
-- AND schemaname = 'storage'
-- AND policyname LIKE '%emos-pdf%';

