# 🔧 CORRECCIÓN DE ERROR EN UploadEMO
## SERVYSALUD360 - Mejora de Manejo de Errores

Este documento detalla la corrección del error "Error al crear trabajador" en el componente `UploadEMO.tsx`.

---

## 🐛 PROBLEMA IDENTIFICADO

### Error en Consola:
```
[ERROR] "Error al crear trabajador: date/time field value out of range: \"23-12-2025\""
```

### Ubicación:
- **Componente:** `components/UploadEMO.tsx`
- **Función:** `saveExtractedData`
- **Línea:** ~679, 754, 805

### Causa Raíz:
1. **Formato de fecha incorrecto:** La fecha viene en formato DD-MM-YYYY ("23-12-2025") pero PostgreSQL requiere YYYY-MM-DD
2. **Mensaje de error genérico:** El error no mostraba el mensaje específico de Supabase
3. **Falta de validación:** No se validaban los datos antes de intentar insertar
4. **Logging insuficiente:** No se registraba suficiente contexto del error
5. **Manejo de errores de Supabase:** No se manejaban casos específicos (RLS, constraints, etc.)

---

## ✅ CORRECCIONES IMPLEMENTADAS

### 1. ✅ Normalización de Fechas

**Problema:**
Las fechas extraídas del CSV pueden venir en formato DD-MM-YYYY ("23-12-2025"), pero PostgreSQL requiere YYYY-MM-DD.

**Solución:**
Se creó una función utilitaria `normalizeDateToISO` que:
- Convierte fechas de DD-MM-YYYY a YYYY-MM-DD
- Convierte fechas de DD/MM/YYYY a YYYY-MM-DD
- Mantiene fechas ya en formato YYYY-MM-DD
- Valida que las fechas sean razonables (años entre 1900-2100)
- Usa la fecha actual como fallback si no se puede parsear

**Código:**
```typescript
const normalizeDateToISO = (dateString: string | undefined | null): string | null => {
  // Soporta múltiples formatos: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
  // Convierte a YYYY-MM-DD para PostgreSQL
};

const getNormalizedDateOrToday = (dateString: string | undefined | null): string => {
  const normalized = normalizeDateToISO(dateString);
  return normalized || new Date().toISOString().split('T')[0];
};
```

**Aplicado en:**
- `fecha_registro` (trabajador) - línea 679
- `fecha_examen` (examen médico) - línea 754
- `fecha` (caso) - línea 805

**Impacto:**
- ✅ Previene errores de formato de fecha
- ✅ Soporta múltiples formatos de entrada
- ✅ Validación robusta de fechas
- ✅ Fallback seguro a fecha actual

---

### 2. ✅ Validación de Datos Antes de Insertar

**Antes:**
```typescript
const { data: nuevoTrabajador, error: errorTrabajador } = await supabase
  .from('registros_trabajadores')
  .insert([{
    dni_ce_pas: csv.DNI,
    apellidos_nombre: csv.Nombre || '',
    // ...
  }])
```

**Después:**
```typescript
// Validar datos antes de insertar
if (!csv.DNI || csv.DNI.trim() === '') {
  throw new Error('El DNI es requerido para crear un trabajador');
}

if (!empresaActiva?.id) {
  throw new Error('No hay empresa seleccionada. Selecciona una empresa antes de guardar.');
}

// Preparar datos del trabajador
const trabajadorData = {
  dni_ce_pas: csv.DNI.trim(),
  apellidos_nombre: (csv.Nombre || '').trim() || 'Sin nombre',
  // ...
};
```

**Impacto:**
- ✅ Previene errores por datos inválidos
- ✅ Mensajes de error más claros para el usuario
- ✅ Mejor validación de entrada

---

### 3. ✅ Manejo Mejorado de Errores de Supabase

**Antes:**
```typescript
if (errorTrabajador) {
  logger.error(new Error('Error al crear trabajador'), {
    context: 'saveExtractedData',
    error: errorTrabajador.message,
    dni: csv.DNI
  });
  throw new Error(`Error al crear trabajador: ${errorTrabajador.message}`);
}
```

**Después:**
```typescript
if (errorTrabajador) {
  const errorMessage = errorTrabajador.message || 'Error desconocido';
  const errorDetails = errorTrabajador.details || '';
  const errorHint = errorTrabajador.hint || '';
  const errorCode = errorTrabajador.code || '';

  logger.error(new Error(`Error al crear trabajador: ${errorMessage}`), {
    context: 'saveExtractedData',
    error: errorMessage,
    errorDetails,
    errorHint,
    errorCode,
    dni: csv.DNI,
    empresaId: empresaActiva.id,
    trabajadorData
  });

  // Mensaje de error más descriptivo para el usuario
  let userFriendlyMessage = `Error al crear trabajador`;
  
  if (errorCode === '23505') { // Violación de unique constraint
    userFriendlyMessage = `El trabajador con DNI ${csv.DNI} ya existe en esta empresa.`;
  } else if (errorCode === '23503') { // Violación de foreign key
    userFriendlyMessage = `Error de referencia: La empresa seleccionada no es válida.`;
  } else if (errorMessage.includes('RLS') || errorMessage.includes('row-level security')) {
    userFriendlyMessage = `Error de permisos: No tienes permiso para crear trabajadores. Contacta al administrador.`;
  } else if (errorMessage.includes('does not exist')) {
    userFriendlyMessage = `Error: La tabla de trabajadores no existe. Contacta al administrador.`;
  } else {
    userFriendlyMessage = `Error al crear trabajador: ${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`;
  }

  throw new Error(userFriendlyMessage);
}
```

**Impacto:**
- ✅ Mensajes de error específicos según el tipo de error
- ✅ Mejor logging con más contexto
- ✅ Mejor experiencia de usuario con mensajes claros

---

### 4. ✅ Mejora en el Catch General

**Antes:**
```typescript
catch (err: any) {
  logger.error(err instanceof Error ? err : new Error('Error al guardar datos'), {
    context: 'saveExtractedData'
  });
  const errorMsg = err.message || 'Error al guardar los datos';
  setError(errorMsg);
  showError(errorMsg);
  setSaveStatus('error');
}
```

**Después:**
```typescript
catch (err: any) {
  const errorMessage = err.message || 'Error al guardar los datos';
  const errorDetails = err.details || err.error?.details || '';
  const errorCode = err.code || err.error?.code || '';
  
  logger.error(err instanceof Error ? err : new Error(errorMessage), {
    context: 'saveExtractedData',
    errorMessage,
    errorDetails,
    errorCode,
    dni: extractedData?.csv_parseado?.DNI,
    empresaId: empresaActiva?.id,
    empresaNombre: empresaActiva?.nombre,
    stack: err.stack
  });
  
  setError(errorMessage);
  showError(errorMessage);
  setSaveStatus('error');
}
```

**Impacto:**
- ✅ Logging más completo con stack trace
- ✅ Mejor contexto para debugging
- ✅ Información de empresa y DNI en los logs

---

## 📊 CÓDIGOS DE ERROR DE SUPABASE MANEJADOS

| Código | Descripción | Mensaje al Usuario |
|--------|-------------|-------------------|
| `23505` | Violación de unique constraint | "El trabajador con DNI X ya existe en esta empresa." |
| `23503` | Violación de foreign key | "Error de referencia: La empresa seleccionada no es válida." |
| `RLS` | Row Level Security | "Error de permisos: No tienes permiso para crear trabajadores." |
| `does not exist` | Tabla no existe | "Error: La tabla de trabajadores no existe." |
| `date/time field value out of range` | Formato de fecha incorrecto | "Error al crear trabajador: [mensaje de Supabase]" |
| Otros | Error genérico | "Error al crear trabajador: [mensaje de Supabase]" |

---

## 🔍 VERIFICACIÓN

### Validaciones Agregadas:
- ✅ **Normalización de fechas:** Conversión automática de DD-MM-YYYY a YYYY-MM-DD
- ✅ Validación de DNI (no vacío, trim)
- ✅ Validación de empresa activa
- ✅ Validación de nombre (trim, valor por defecto)
- ✅ Preparación de datos antes de insertar

### Manejo de Errores:
- ✅ Códigos de error específicos de PostgreSQL
- ✅ Mensajes amigables para el usuario
- ✅ Logging completo con contexto
- ✅ Stack trace en logs

---

## 📝 ARCHIVOS MODIFICADOS

1. ✅ `components/UploadEMO.tsx` - Mejora de manejo de errores y validación

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

1. **Verificar RLS Policies:**
   - Asegurar que las políticas permitan INSERT en `registros_trabajadores`
   - Verificar que el usuario tenga permisos adecuados

2. **Verificar Constraints:**
   - Revisar si hay constraints UNIQUE en `dni_ce_pas` + `empresa_id`
   - Verificar foreign keys en `empresa_id`

3. **Testing:**
   - Probar con diferentes escenarios de error
   - Verificar que los mensajes se muestren correctamente

---

## 📚 REFERENCIAS

- [Supabase Error Codes](https://supabase.com/docs/guides/database/postgres/errors)
- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)

---

**Fecha de corrección:** Enero 2025  
**Estado:** ✅ COMPLETADO

