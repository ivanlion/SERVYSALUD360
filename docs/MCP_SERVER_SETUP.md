# 🚀 Servidor MCP - SERVYSALUD360

## 📋 Resumen

Servidor MCP (Model Context Protocol) completo para análisis de exámenes médicos ocupacionales usando Gemini 2.0 Flash.

## 🏗️ Arquitectura

```
servysalud-pro/
├── mcp-server/              # Servidor MCP independiente
│   ├── src/
│   │   ├── index.ts         # Punto de entrada y handleRequest
│   │   ├── services/
│   │   │   ├── supabase.ts  # Cliente Supabase
│   │   │   └── gemini.ts    # Servicio Gemini 2.0 Flash
│   │   ├── tools/           # Herramientas MCP
│   │   │   ├── casos.ts
│   │   │   ├── trabajadores.ts
│   │   │   ├── examenes.ts  # Análisis de EMO con Gemini
│   │   │   ├── storage.ts
│   │   │   └── index.ts
│   │   └── schemas/
│   │       └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── app/api/mcp/             # Endpoint Next.js
│   └── route.ts             # API route JSON-RPC 2.0
└── scripts/
    └── analizar-emo.ts      # Script de análisis automatizado
```

## 🔌 Conexiones

### 1. Next.js → MCP Server
- **Endpoint**: `POST /api/mcp`
- **Formato**: JSON-RPC 2.0
- **Importación**: Dinámica desde `mcp-server/src/index`
- **Configuración**: `transpilePackages` en `next.config.ts`

### 2. MCP Server → Supabase
- **Cliente**: `initSupabaseClient()` en `mcp-server/src/services/supabase.ts`
- **Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### 3. MCP Server → Gemini AI
- **Modelo**: `gemini-2.0-flash`
- **Servicio**: `analyzeDocument()` en `mcp-server/src/services/gemini.ts`
- **Variable**: `NEXT_PUBLIC_GEMINI_API_KEY`

## 🛠️ Herramientas Disponibles

### Casos
- `casos_listar` - Lista casos de trabajo modificado
- `casos_obtener` - Obtiene un caso por ID
- `casos_buscar` - Busca casos por término

### Trabajadores
- `trabajadores_listar` - Lista trabajadores
- `trabajadores_obtener` - Obtiene trabajador por DNI

### Exámenes
- `examenes_listar` - Lista exámenes médicos
- `examenes_analizar` - Analiza PDF de EMO con Gemini 2.0 Flash
  - Extrae: aptitud, restricciones, hallazgos, espirometría, audiometría
  - Formato: Resumen clínico + CSV estructurado

### Storage
- `storage_listar` - Lista archivos en bucket
- `storage_descargar` - Descarga archivo (retorna base64)

## 📝 Uso

### Desde Script TypeScript
```bash
npm run analizar-emo
```

### Desde curl
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

## ✅ Estado Actual

- ✅ Servidor MCP completamente funcional
- ✅ Integración con Next.js vía API route
- ✅ Análisis de EMO con Gemini 2.0 Flash
- ✅ Extracción precisa de restricciones médicas
- ✅ Script TypeScript para análisis automatizado
- ✅ Compilación sin errores

## 🔧 Configuración Requerida

Variables de entorno en `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_GEMINI_API_KEY=...
```

