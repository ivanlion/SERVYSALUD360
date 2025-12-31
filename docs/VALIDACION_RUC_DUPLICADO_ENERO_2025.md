# ✅ VALIDACIÓN DE RUC DUPLICADO EN GESTIÓN DE EMPRESAS
## SERVYSALUD360 - Prevención de Empresas Duplicadas

Este documento detalla la implementación de validación para prevenir la creación de empresas con el mismo RUC.

---

## 🎯 OBJETIVO

Evitar que se creen múltiples empresas con el mismo RUC, mostrando una notificación clara al usuario cuando intente crear una empresa con un RUC que ya existe.

---

## 🐛 PROBLEMA IDENTIFICADO

**Situación:**
- El sistema permitía crear múltiples empresas con el mismo RUC
- No había validación que verificara si ya existía una empresa con ese RUC
- Esto generaba duplicados en la base de datos

**Ejemplo:**
- Empresa 1: "SERVICIOS Y SALUD LF E.I.R.L." - RUC: 20607405761
- Empresa 2: "SERVICIOS Y SALUD LF E.I.R.L." - RUC: 20607405761 (duplicado)

---

## ✅ SOLUCIÓN IMPLEMENTADA

### 1. Validación en `CompanyContext.tsx`

**Ubicación:** `contexts/CompanyContext.tsx` - Función `addEmpresa`

**Código agregado:**
```typescript
// VALIDACIÓN: Verificar si ya existe una empresa con el mismo RUC
if (empresaData.ruc && empresaData.ruc.trim()) {
  const rucLimpio = empresaData.ruc.trim();
  logger.debug('[addEmpresa] Verificando si existe empresa con RUC:', rucLimpio);
  
  const { data: empresaExistente, error: busquedaError } = await supabase
    .from('empresas')
    .select('id, nombre, ruc')
    .eq('ruc', rucLimpio)
    .maybeSingle();

  if (busquedaError) {
    logger.error(new Error(busquedaError.message), {
      context: 'addEmpresa',
      error: 'Error al verificar RUC duplicado',
      ruc: rucLimpio
    });
    // Continuar con la creación si hay error en la búsqueda (no bloquear)
  } else if (empresaExistente) {
    const errorMsg = `Ya existe una empresa con el RUC ${rucLimpio}.\n\nEmpresa existente: ${empresaExistente.nombre}`;
    logger.warn('[addEmpresa] Intento de crear empresa con RUC duplicado:', {
      ruc: rucLimpio,
      empresaExistente: empresaExistente.nombre,
      empresaExistenteId: empresaExistente.id
    });
    // Lanzar error para que el componente lo maneje
    throw new Error(errorMsg);
  }
}
```

**Características:**
- ✅ Verifica si existe una empresa con el mismo RUC antes de crear
- ✅ Solo valida si el RUC no está vacío
- ✅ Usa `maybeSingle()` para evitar errores si no existe
- ✅ Lanza un error descriptivo si encuentra duplicado
- ✅ Incluye el nombre de la empresa existente en el mensaje

---

### 2. Manejo de Errores en `GestionEmpresas.tsx`

**Ubicación:** `components/GestionEmpresas.tsx` - Función `handleCreate`

**Mejoras implementadas:**
```typescript
const handleCreate = async () => {
  if (!formData.nombre.trim()) {
    showError('El nombre de la empresa es requerido');
    return;
  }

  try {
    const nuevaEmpresa = await addEmpresa({
      // ... datos de la empresa
    });

    if (nuevaEmpresa) {
      showSuccess('Empresa creada exitosamente');
      setIsCreating(false);
      setStep('ruc');
      setFormData({ /* limpiar formulario */ });
      setRucError(null);
    } else {
      showError('Error al crear la empresa. Por favor, intenta nuevamente.');
    }
  } catch (error: any) {
    // Manejar error de RUC duplicado u otros errores
    const errorMessage = error.message || 'Error al crear la empresa. Por favor, intenta nuevamente.';
    showError(errorMessage);
    logger.error(error instanceof Error ? error : new Error(errorMessage), {
      context: 'handleCreate'
    });
  }
};
```

**Características:**
- ✅ Usa `try-catch` para capturar errores de validación
- ✅ Muestra notificación de error usando `showError` (NotificationContext)
- ✅ Muestra notificación de éxito usando `showSuccess`
- ✅ Limpia el formulario después de crear exitosamente
- ✅ Logging completo de errores

---

### 3. Validación en Edición de Empresas

**Ubicación:** `components/GestionEmpresas.tsx` - Función `handleUpdate`

**Código agregado:**
```typescript
// VALIDACIÓN: Verificar si el RUC ya existe en otra empresa (solo si se está editando el RUC)
if (formData.ruc && formData.ruc.trim()) {
  const rucLimpio = formData.ruc.trim();
  const empresaActual = empresas.find(e => e.id === id);
  
  // Solo validar si el RUC cambió o si la empresa actual no tiene RUC
  if (!empresaActual?.ruc || empresaActual.ruc !== rucLimpio) {
    const empresaConMismoRuc = empresas.find(e => e.id !== id && e.ruc === rucLimpio);
    if (empresaConMismoRuc) {
      showError(`Ya existe otra empresa con el RUC ${rucLimpio}.\n\nEmpresa existente: ${empresaConMismoRuc.nombre}`);
      return;
    }
  }
}
```

**Características:**
- ✅ Valida RUC duplicado al editar una empresa
- ✅ Solo valida si el RUC cambió (no bloquea si es el mismo)
- ✅ Busca en la lista local de empresas (más rápido)
- ✅ Muestra mensaje claro con el nombre de la empresa existente

---

## 📊 FLUJO DE VALIDACIÓN

### Crear Nueva Empresa:
1. Usuario ingresa RUC y otros datos
2. Usuario hace clic en "Crear"
3. **Validación:** Se verifica si existe empresa con ese RUC
4. **Si existe:** Se muestra error y se cancela la creación
5. **Si no existe:** Se crea la empresa normalmente

### Editar Empresa Existente:
1. Usuario edita datos de la empresa (incluyendo RUC)
2. Usuario hace clic en "Guardar"
3. **Validación:** Se verifica si el RUC cambió
4. **Si cambió:** Se verifica si otra empresa tiene ese RUC
5. **Si existe duplicado:** Se muestra error y se cancela la actualización
6. **Si no hay duplicado:** Se actualiza la empresa normalmente

---

## 🎨 MENSAJES AL USUARIO

### Error de RUC Duplicado (Crear):
```
Ya existe una empresa con el RUC 20607405761.

Empresa existente: SERVICIOS Y SALUD LF E.I.R.L.
```

### Error de RUC Duplicado (Editar):
```
Ya existe otra empresa con el RUC 20607405761.

Empresa existente: SERVICIOS Y SALUD LF E.I.R.L.
```

### Éxito:
```
Empresa creada exitosamente
```

---

## 🔍 CASOS ESPECIALES MANEJADOS

1. **RUC vacío:** No se valida (el RUC es opcional)
2. **Error en búsqueda:** Se continúa con la creación (no se bloquea por errores de red)
3. **Edición sin cambio de RUC:** No se valida (no hay necesidad)
4. **Múltiples usuarios:** La validación es global (todos los usuarios)

---

## 📝 ARCHIVOS MODIFICADOS

1. ✅ `contexts/CompanyContext.tsx`
   - Agregada validación de RUC duplicado en `addEmpresa`
   - Verificación antes de llamar a la función RPC

2. ✅ `components/GestionEmpresas.tsx`
   - Mejorado manejo de errores en `handleCreate`
   - Agregada validación de RUC duplicado en `handleUpdate`
   - Uso de `showError` y `showSuccess` para notificaciones

---

## 🧪 TESTING RECOMENDADO

1. **Crear empresa con RUC nuevo:** ✅ Debe funcionar normalmente
2. **Crear empresa con RUC existente:** ❌ Debe mostrar error
3. **Editar empresa sin cambiar RUC:** ✅ Debe funcionar normalmente
4. **Editar empresa cambiando RUC a uno existente:** ❌ Debe mostrar error
5. **Crear empresa sin RUC:** ✅ Debe funcionar normalmente

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

1. **Índice único en base de datos:**
   - Agregar constraint UNIQUE en la columna `ruc` de la tabla `empresas`
   - Esto previene duplicados a nivel de base de datos

2. **Validación en tiempo real:**
   - Validar RUC mientras el usuario escribe (debounce)
   - Mostrar indicador visual si el RUC ya existe

3. **Sugerencia de empresa existente:**
   - Si el RUC existe, ofrecer opción de usar la empresa existente
   - Evitar crear duplicados accidentalmente

---

**Fecha de implementación:** Enero 2025  
**Estado:** ✅ COMPLETADO


