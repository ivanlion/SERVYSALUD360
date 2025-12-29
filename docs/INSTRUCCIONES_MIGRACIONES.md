# 📋 Instrucciones para Ejecutar Migraciones SQL

## 🎯 Objetivo

Ejecutar las migraciones SQL necesarias para habilitar el sistema multi-tenancy en SERVYSALUD360.

## 📝 Pasos a Seguir

### Opción 1: Ejecutar Todo de Una Vez (RECOMENDADO)

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
   - Navega a **SQL Editor** en el menú lateral

2. **Copia el Script Completo**
   - Abre el archivo: `scripts/ejecutar-migraciones.sql`
   - Copia **TODO** el contenido

3. **Pega y Ejecuta**
   - Pega el contenido en el SQL Editor de Supabase
   - Haz clic en **RUN** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Espera a que termine la ejecución

4. **Verifica**
   - Deberías ver mensajes de éxito para cada paso
   - Si hay errores, revisa el mensaje (algunos pueden ser normales si las tablas ya existen)

### Opción 2: Ejecutar por Pasos (Si Prefieres Más Control)

#### Paso 1: Crear Tablas de Empresas

1. Abre `docs/SQL_EMPRESAS.sql`
2. Copia todo el contenido
3. Pégalo en Supabase SQL Editor
4. Ejecuta
5. Verifica que las tablas se crearon:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('empresas', 'user_empresas');
   ```

#### Paso 2: Agregar empresa_id a Tablas

1. Abre `docs/SQL_MIGRACION_EMPRESA_ID.sql`
2. Copia todo el contenido
3. Pégalo en Supabase SQL Editor
4. Ejecuta
5. Verifica que las columnas se agregaron:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'casos' AND column_name = 'empresa_id';
   
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'registros_trabajadores' AND column_name = 'empresa_id';
   ```

#### Paso 3: Configurar RLS

1. Abre `docs/SQL_RLS_MULTITENANCY.sql`
2. Copia todo el contenido
3. Pégalo en Supabase SQL Editor
4. Ejecuta
5. Verifica que RLS está habilitado:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('casos', 'registros_trabajadores', 'empresas');
   ```

## ✅ Verificación Final

Ejecuta estas consultas para verificar que todo está correcto:

```sql
-- 1. Verificar tablas de empresas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('empresas', 'user_empresas');

-- 2. Verificar columnas empresa_id
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
AND column_name = 'empresa_id'
ORDER BY table_name;

-- 3. Verificar RLS habilitado
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('casos', 'registros_trabajadores', 'empresas', 'user_empresas')
ORDER BY tablename;

-- 4. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('casos', 'registros_trabajadores', 'empresas', 'user_empresas')
ORDER BY tablename, policyname;
```

## ⚠️ Notas Importantes

1. **Backup**: Aunque las migraciones son seguras (usan `IF NOT EXISTS`), siempre es recomendable hacer un backup antes de ejecutar migraciones en producción.

2. **Errores Esperados**: 
   - Si ves errores como "relation already exists", es normal si ya ejecutaste las migraciones antes
   - Si ves errores sobre políticas que ya existen, también es normal

3. **Datos Existentes**: 
   - Los registros existentes tendrán `empresa_id = NULL` por defecto
   - Puedes asignarlos a una empresa después si es necesario

4. **Permisos**: 
   - Asegúrate de tener permisos de administrador en Supabase
   - Si usas Service Role Key, las políticas RLS no se aplicarán (solo para desarrollo)

## 🚀 Después de Ejecutar

Una vez ejecutadas las migraciones:

1. **Reinicia la aplicación** (si está corriendo)
2. **Prueba crear una empresa** desde el módulo "Gestión de Empresas"
3. **Verifica que el selector de empresa** funciona en el Header
4. **Prueba subir un EMO** y verifica que se guarda con `empresa_id`
5. **Verifica el filtrado** en WorkModifiedDashboard al cambiar de empresa

## 📞 Soporte

Si encuentras errores al ejecutar las migraciones:

1. Copia el mensaje de error completo
2. Verifica que tienes permisos de administrador
3. Verifica que las tablas base (`casos`, `registros_trabajadores`) existen
4. Revisa los logs en Supabase Dashboard → Logs → Postgres Logs

