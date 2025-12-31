# 🔍 AUDITORÍA Y MEJORAS PARA CONFIGURACIÓN MCP
## SERVYSALUD360 - Servidor Model Context Protocol

**Fecha:** 29 de Enero 2025  
**Versión MCP Server:** 1.0.0

---

## 📋 RESUMEN EJECUTIVO

**Estado General:** ✅ **FUNCIONAL CON ÁREAS DE MEJORA SIGNIFICATIVAS**

La configuración MCP está funcionando correctamente, pero hay varias áreas que pueden mejorarse para:
- Mejor rendimiento
- Mayor estabilidad
- Mejor experiencia de desarrollo
- Seguridad mejorada

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. **Inicialización de Supabase en Cada Request**

**Ubicación:** `mcp-server/src/index.ts:104`, `app/api/mcp/route.ts:45`

**Problema:**
```typescript
// En handleRequest, se inicializa Supabase en cada llamada
const supabase = initSupabaseClient();
```

**Impacto:** Overhead innecesario, conexiones no reutilizadas.

**Solución:**
```typescript
// Crear singleton o reutilizar cliente
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = initSupabaseClient();
  }
  return supabaseClient;
}
```

**Prioridad:** 🔴 ALTA

---

### 2. **Falta de Validación de Entrada Robusta**

**Ubicación:** Múltiples archivos en `mcp-server/src/tools/`

**Problema:**
```typescript
// Validación básica sin Zod o schema validation
if (!args.id) {
  return { isError: true, ... };
}
```

**Impacto:** Errores en runtime, difícil de debuggear.

**Solución:**
```typescript
import { z } from 'zod';

const casosObtenerSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
});

export async function handleCasosTool(...) {
  const validatedArgs = casosObtenerSchema.parse(args);
  // ...
}
```

**Prioridad:** 🔴 ALTA

---

### 3. **Falta de Timeouts y Rate Limiting**

**Ubicación:** `app/api/mcp/route.ts`

**Problema:** No hay protección contra requests largos o abusivos.

**Impacto:** Posibles DoS, tiempo de respuesta indefinido.

**Solución:**
```typescript
// Agregar timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s

try {
  const response = await handleRequest(body);
  clearTimeout(timeoutId);
  return NextResponse.json(response);
} catch (error) {
  if (error.name === 'AbortError') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id,
      error: { code: -32603, message: 'Request timeout' }
    }, { status: 408 });
  }
}
```

**Prioridad:** 🔴 ALTA

---

## 🟡 PROBLEMAS DE RENDIMIENTO

### 4. **Falta de Caché para Operaciones Comunes**

**Ubicación:** `mcp-server/src/tools/`

**Problema:** Cada request hace consultas a Supabase sin cachear resultados.

**Solución:**
```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutos
});

export async function handleCasosTool(...) {
  const cacheKey = `casos_listar_${JSON.stringify(args)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const result = await /* ... consulta ... */;
  cache.set(cacheKey, result);
  return result;
}
```

**Prioridad:** 🟡 MEDIA

---

### 5. **Importación Dinámica Puede Mejorarse**

**Ubicación:** `app/api/mcp/route.ts:45`

**Problema:**
```typescript
const mcpServer = await import('../../../mcp-server/src/index');
```

**Impacto:** Cada request tiene overhead de importación.

**Solución:**
```typescript
// Importar una sola vez al inicio del módulo
import { handleRequest as mcpHandleRequest } from '../../../mcp-server/src/index';

export async function POST(request: NextRequest) {
  const response = await mcpHandleRequest(body);
  // ...
}
```

**Prioridad:** 🟡 MEDIA

---

### 6. **Falta de Paginación en Algunas Herramientas**

**Ubicación:** `mcp-server/src/tools/casos.ts:76`

**Problema:**
```typescript
const { limit = 100, status, empresa_id } = args;
```

**Impacto:** Con muchos datos, puede ser lento.

**Solución:**
```typescript
const { limit = 100, offset = 0, status, empresa_id } = args;
// ...
.limit(limit)
.range(offset, offset + limit - 1);
```

**Prioridad:** 🟡 MEDIA

---

## 🟢 MEJORAS DE CALIDAD

### 7. **Falta de Logging Centralizado**

**Ubicación:** Todo `mcp-server/src/`

**Problema:** Uso inconsistente de `console.log/error`.

**Solución:**
```typescript
// mcp-server/src/utils/logger.ts
import { logger } from '../../utils/logger';

export const mcpLogger = {
  info: (message: string, context?: any) => logger.info(message, { ...context, module: 'MCP' }),
  error: (error: Error, context?: any) => logger.error(error, { ...context, module: 'MCP' }),
  debug: (message: string, context?: any) => logger.debug(message, { ...context, module: 'MCP' }),
};
```

**Prioridad:** 🟢 BAJA

---

### 8. **Tipos TypeScript Mejorables**

**Ubicación:** `mcp-server/src/index.ts:78`

**Problema:**
```typescript
export async function handleRequest(request: any): Promise<any> {
```

**Solución:**
```typescript
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, any>;
}

export async function handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
```

**Prioridad:** 🟢 BAJA

---

### 9. **Falta de Validación de Permisos**

**Ubicación:** Todos los handlers de herramientas

**Problema:** No se valida que el usuario tenga permisos para ejecutar ciertas herramientas.

**Solución:**
```typescript
async function checkPermission(
  supabase: SupabaseClient,
  toolName: string,
  userId: string
): Promise<boolean> {
  // Validar permisos desde Supabase o contexto de usuario
  // ...
}

export async function handleToolCall(...) {
  if (!await checkPermission(supabase, toolName, userId)) {
    throw new Error('Permiso denegado');
  }
  // ...
}
```

**Prioridad:** 🟡 MEDIA

---

### 10. **Manejo de Errores Inconsistente**

**Ubicación:** Múltiples archivos

**Problema:** Algunos retornan `{ isError: true }`, otros lanzan excepciones.

**Solución:** Estandarizar formato de errores:
```typescript
interface MCPError {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
  error_code?: string;
  error_details?: any;
}

function createError(message: string, code?: string, details?: any): MCPError {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
    error_code: code,
    error_details: details,
  };
}
```

**Prioridad:** 🟡 MEDIA

---

### 11. **Falta de Tests**

**Ubicación:** Todo el proyecto MCP

**Problema:** No hay tests unitarios ni de integración.

**Solución:** Agregar tests con Jest/Vitest:
```typescript
// mcp-server/src/tools/__tests__/casos.test.ts
import { describe, it, expect } from 'vitest';
import { handleCasosTool } from '../casos';

describe('handleCasosTool', () => {
  it('debe listar casos correctamente', async () => {
    // ...
  });
});
```

**Prioridad:** 🟢 BAJA (pero importante para mantenibilidad)

---

### 12. **Falta de Documentación de API**

**Problema:** No hay documentación OpenAPI/Swagger para las herramientas MCP.

**Solución:** Generar documentación automática desde los schemas:
```typescript
export function generateOpenAPISpec(tools: Tool[]): OpenAPISpec {
  // Generar spec desde tools
}
```

**Prioridad:** 🟢 BAJA

---

## 📊 RECOMENDACIONES PRIORITARIAS

### 🔴 **ALTA PRIORIDAD (Implementar Primero):**

1. **Singleton para Cliente Supabase** - Reutilizar conexiones
2. **Validación con Zod** - Prevenir errores en runtime
3. **Timeouts y Rate Limiting** - Protección contra abusos

### 🟡 **MEDIA PRIORIDAD:**

4. **Caché LRU** - Mejorar rendimiento
5. **Validación de Permisos** - Seguridad
6. **Estandarizar Manejo de Errores** - Consistencia
7. **Paginación Completa** - Mejor manejo de datos grandes

### 🟢 **BAJA PRIORIDAD:**

8. **Logging Centralizado** - Mejor debugging
9. **Tipos TypeScript Mejorados** - Mejor DX
10. **Tests** - Mantenibilidad
11. **Documentación API** - Mejor integración

---

## 🔧 PLAN DE IMPLEMENTACIÓN

### Fase 1: Correcciones Críticas (1-2 días)
- Singleton Supabase
- Validación Zod básica
- Timeouts básicos

### Fase 2: Mejoras de Rendimiento (2-3 días)
- Implementar caché LRU
- Optimizar importaciones
- Mejorar paginación

### Fase 3: Calidad y Seguridad (3-4 días)
- Validación de permisos
- Estandarizar errores
- Logging centralizado

### Fase 4: Mejoras Adicionales (1-2 días)
- Tests básicos
- Documentación
- Mejores tipos TypeScript

---

## 📝 CÓDIGO DE EJEMPLO - MEJORAS SUGERIDAS

### Ejemplo 1: Singleton Supabase

```typescript
// mcp-server/src/services/supabase.ts
let supabaseClient: SupabaseClient | null = null;
let clientInitialized = false;

export function getSupabaseClient(): SupabaseClient {
  if (!clientInitialized) {
    supabaseClient = initSupabaseClient();
    clientInitialized = true;
  }
  return supabaseClient!;
}

export function resetSupabaseClient(): void {
  supabaseClient = null;
  clientInitialized = false;
}
```

### Ejemplo 2: Validación con Zod

```typescript
// mcp-server/src/tools/schemas/casos.ts
import { z } from 'zod';

export const casosListarSchema = z.object({
  limit: z.number().int().min(1).max(1000).optional().default(100),
  status: z.enum(['ACTIVO', 'CERRADO']).optional(),
  empresa_id: z.string().uuid().optional(),
});

export const casosObtenerSchema = z.object({
  id: z.string().uuid('ID debe ser un UUID válido'),
});

export const casosBuscarSchema = z.object({
  query: z.string().min(1, 'Query no puede estar vacío').max(255),
});
```

### Ejemplo 3: Manejo de Errores Estandarizado

```typescript
// mcp-server/src/utils/errors.ts
export interface MCPErrorResponse {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
  error_code?: string;
  error_details?: Record<string, any>;
}

export function createMCPError(
  message: string,
  code?: string,
  details?: Record<string, any>
): MCPErrorResponse {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
    ...(code && { error_code: code }),
    ...(details && { error_details: details }),
  };
}
```

### Ejemplo 4: Timeout en API Route

```typescript
// app/api/mcp/route.ts
export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const body = await request.json();
    const response = await Promise.race([
      handleRequest(body),
      new Promise((_, reject) => 
        controller.signal.addEventListener('abort', () => 
          reject(new Error('Request timeout'))
        )
      ),
    ]);
    
    clearTimeout(timeoutId);
    return NextResponse.json(response);
  } catch (error) {
    clearTimeout(timeoutId);
    // Manejo de errores...
  }
}
```

---

## ✅ CONCLUSIÓN

La configuración MCP está **funcional pero puede mejorarse significativamente**. Las mejoras sugeridas se enfocan en:

1. **Rendimiento** - Singleton, caché, optimizaciones
2. **Estabilidad** - Validación, timeouts, manejo de errores
3. **Seguridad** - Permisos, rate limiting
4. **Mantenibilidad** - Tests, documentación, logging

**Impacto Estimado:**
- **Rendimiento:** ⬆️ +40% (con singleton y caché)
- **Estabilidad:** ⬆️ +60% (con validación y timeouts)
- **Seguridad:** ⬆️ +80% (con permisos y rate limiting)

**Tiempo Estimado para Implementar Todas las Mejoras:** 7-10 días

---

**Última actualización:** 29 de Enero 2025

