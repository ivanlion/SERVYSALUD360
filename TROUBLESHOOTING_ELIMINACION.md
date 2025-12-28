# 🔍 Guía de Diagnóstico - Problema al Eliminar Registros

## Síntoma
Al intentar eliminar un trabajador, aparece el mensaje de éxito pero el registro no se elimina realmente en Supabase.

## Pasos de Diagnóstico

### 1. Abrir la Consola del Navegador

1. Presiona `F12` o `Cmd+Option+I` (Mac) para abrir las herramientas de desarrollador
2. Ve a la pestaña **"Console"** (Consola)
3. Intenta eliminar un registro
4. Revisa los mensajes que aparecen en la consola

### 2. Verificar los Logs

Los logs te mostrarán:
- ✅ `✓ ID de Supabase capturado:` - Confirma que el ID se está capturando
- 🗑️ `🗑️ Intentando eliminar registro:` - Muestra qué ID se está usando
- ✅ `✅ Registro eliminado exitosamente` - Confirma que Supabase aceptó la eliminación
- ❌ `❌ Error de Supabase al eliminar:` - Muestra el error si algo falla

### 3. Problemas Comunes y Soluciones

#### Problema A: "⚠️ Registro sin ID de Supabase"

**Causa**: La tabla no tiene una columna `id` o no está siendo devuelta por Supabase.

**Solución**:
1. Ve a tu proyecto en Supabase
2. Ve a **Table Editor** → **registros_trabajadores**
3. Verifica que existe una columna `id`
4. Si no existe, crea una columna `id` de tipo `bigint` o `uuid`
5. Configúrala como **Primary Key** y **Auto-increment** (si es bigint)

#### Problema B: Error de Políticas RLS (Row Level Security)

**Síntoma**: En la consola aparece un error como:
```
new row violates row-level security policy
```

**Solución**:
1. Ve a Supabase → **Authentication** → **Policies**
2. Selecciona la tabla `registros_trabajadores`
3. Verifica que existe una política que permita **DELETE**
4. Si no existe, crea una política:
   - **Policy Name**: `Allow delete for authenticated users`
   - **Allowed Operation**: `DELETE`
   - **Target Roles**: `authenticated`
   - **Policy Definition**: `true` (permite a todos los usuarios autenticados eliminar)

**O temporalmente desactiva RLS para testing**:
1. Ve a **Table Editor** → **registros_trabajadores**
2. Haz clic en el botón **"..."** (tres puntos)
3. Selecciona **"Disable RLS"** (solo para testing, no recomendado en producción)

#### Problema C: Tipo de ID Incorrecto

**Síntoma**: El ID se captura pero la eliminación falla silenciosamente.

**Solución**:
1. En la consola, verifica qué tipo de ID está usando:
   - `Tipo: number` → La tabla usa IDs numéricos
   - `Tipo: string` → La tabla usa UUIDs
2. Verifica en Supabase que la columna `id` coincida con el tipo mostrado

#### Problema D: Permisos de la API Key

**Síntoma**: Todos los registros fallan al eliminar.

**Solución**:
1. Verifica que estás usando `NEXT_PUBLIC_SUPABASE_ANON_KEY` (no la service_role key)
2. Las políticas RLS deben permitir las operaciones DELETE para usuarios autenticados

### 4. Verificar Estructura de la Tabla

Ejecuta este SQL en Supabase SQL Editor para verificar la estructura:

```sql
-- Ver estructura de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'registros_trabajadores'
ORDER BY ordinal_position;
```

Asegúrate de que:
- Existe una columna `id`
- Es de tipo `bigint` (auto-increment) o `uuid`
- Está configurada como **PRIMARY KEY**

### 5. Crear Columna ID si Falta

Si la tabla no tiene columna `id`, ejecuta este SQL:

```sql
-- Si la tabla no tiene ID, agregarlo
ALTER TABLE registros_trabajadores 
ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;
```

### 6. Crear Política de Eliminación

Si falta la política DELETE, ejecuta este SQL:

```sql
-- Crear política para permitir DELETE a usuarios autenticados
CREATE POLICY "Allow delete for authenticated users"
ON registros_trabajadores
FOR DELETE
TO authenticated
USING (true);
```

### 7. Verificar que los Datos se Están Cargando Correctamente

En la consola, al cargar la página deberías ver:
```
Datos recibidos de Supabase: [array de objetos]
Mapeo registro 0: { supabaseId: ..., caseId: ..., trabajador: ... }
```

Si no ves `supabaseId` en estos logs, el problema está en la carga de datos, no en la eliminación.

## Comandos Útiles para Verificar en Supabase

### Ver todos los registros con sus IDs:
```sql
SELECT id, apellidos_nombre, dni_ce_pas 
FROM registros_trabajadores 
ORDER BY fecha_registro DESC;
```

### Intentar eliminar manualmente (para testing):
```sql
-- Reemplaza 1 con el ID que quieres eliminar
DELETE FROM registros_trabajadores WHERE id = 1;
```

Si este comando funciona pero la aplicación no, el problema es de permisos/políticas.

## Contacto y Soporte

Si después de seguir estos pasos el problema persiste:
1. Copia todos los logs de la consola del navegador
2. Verifica la estructura de tu tabla en Supabase
3. Revisa las políticas RLS configuradas



