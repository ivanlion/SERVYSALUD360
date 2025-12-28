# Integración MCP Server con Cursor Chat

## 📋 Resumen

Este proyecto incluye un servidor MCP (Model Context Protocol) que expone herramientas para interactuar con Supabase y gestionar datos de salud ocupacional.

## 🔧 Configuración del Servidor MCP

### Endpoint
- **URL**: `http://localhost:3000/api/mcp`
- **Formato**: JSON-RPC 2.0
- **Métodos soportados**: `tools/list`, `tools/call`

### Requisitos
1. Servidor Next.js corriendo en `http://localhost:3000`
2. Variables de entorno configuradas en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_GEMINI_API_KEY`

## 🛠️ Herramientas Disponibles

### Casos de Trabajo Modificado

#### `casos_listar`
Lista casos de trabajo modificado con filtros opcionales.

**Parámetros:**
- `limit` (number, opcional): Número máximo de casos (default: 100)
- `status` (string, opcional): Filtrar por estado (`ACTIVO` o `CERRADO`)

**Ejemplo de uso:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "casos_listar",
      "arguments": {
        "limit": 10,
        "status": "ACTIVO"
      }
    }
  }'
```

#### `casos_obtener`
Obtiene un caso específico por ID.

**Parámetros:**
- `id` (string, requerido): ID del caso

#### `casos_buscar`
Busca casos por trabajador, DNI o empresa.

**Parámetros:**
- `query` (string, requerido): Término de búsqueda

### Trabajadores

#### `trabajadores_listar`
Lista todos los trabajadores registrados.

**Parámetros:**
- `limit` (number, opcional): Número máximo de trabajadores (default: 100)

#### `trabajadores_obtener`
Obtiene un trabajador específico por DNI.

**Parámetros:**
- `dni` (string, requerido): DNI del trabajador

### Exámenes Médicos

#### `examenes_listar`
Lista exámenes médicos registrados.

**Parámetros:**
- `limit` (number, opcional): Número máximo de exámenes (default: 100)
- `trabajador_id` (string, opcional): Filtrar por ID de trabajador

### Storage

#### `storage_listar`
Lista archivos en un bucket de Supabase Storage.

**Parámetros:**
- `bucket` (string, requerido): Nombre del bucket
- `path` (string, opcional): Ruta dentro del bucket

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "storage_listar",
      "arguments": {
        "bucket": "emos-pdf"
      }
    }
  }'
```

#### `storage_descargar`
Descarga un archivo de Supabase Storage.

**Parámetros:**
- `bucket` (string, requerido): Nombre del bucket
- `path` (string, requerido): Ruta del archivo

## 🚀 Uso desde Cursor Chat

### Configuración Manual

Actualmente, Cursor Chat puede usar el servidor MCP a través de:

1. **Referencias directas**: Puedes mencionar las herramientas en tus mensajes
2. **API directa**: El servidor MCP está disponible en `/api/mcp`

### Ejemplo de Conversación

```
Usuario: Lista los casos activos usando casos_listar

Asistente: Voy a usar la herramienta casos_listar para obtener los casos activos...
[Llamada a /api/mcp con tools/call]
[Responde con los resultados]
```

## 📝 Agregar Archivos al Bucket emos-pdf

### Método 1: Desde Supabase Dashboard

1. Ve a tu proyecto en Supabase
2. Navega a **Storage** → **Buckets**
3. Selecciona el bucket `emos-pdf`
4. Haz clic en **Upload file**
5. Selecciona tu archivo PDF y súbelo

### Método 2: Desde el código (futuro)

Puedes agregar una herramienta `storage_upload` al servidor MCP para permitir subir archivos programáticamente.

## 🧪 Probar las Herramientas

### Script de Prueba

Ejecuta el script incluido para probar todas las herramientas:

```bash
./scripts/test-mcp-tools.sh
```

### Prueba Manual

```bash
# Listar herramientas
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0","id": 1,"method": "tools/list"}'

# Ejecutar herramienta
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "casos_listar",
      "arguments": {"limit": 5}
    }
  }'
```

## 🔍 Troubleshooting

### El servidor no responde
- Verifica que Next.js esté corriendo en `localhost:3000`
- Revisa los logs del servidor para errores

### Error de conexión a Supabase
- Verifica que las variables de entorno estén configuradas
- Confirma que `SUPABASE_SERVICE_ROLE_KEY` tenga permisos adecuados

### Herramienta no encontrada
- Verifica que el nombre de la herramienta sea correcto
- Lista todas las herramientas con `tools/list`

## 📚 Referencias

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

