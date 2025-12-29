# 🔧 Manejo de Errores y Retry Logic

## 📋 Resumen

Se ha implementado un sistema robusto de manejo de errores y retry logic para el análisis de EMOs con Gemini AI.

## 🔄 Retry Logic

### Configuración
- **Intentos máximos**: 3 por defecto
- **Backoff exponencial**: 1s, 2s, 4s (máximo 10s)
- **Errores recuperables**: Se reintentan automáticamente

### Errores Recuperables
Los siguientes errores se consideran recuperables y se reintentan:
- `ECONNRESET` - Conexión reseteada
- `ETIMEDOUT` - Timeout de conexión
- `ENOTFOUND` - DNS no resuelto
- `ECONNREFUSED` - Conexión rechazada
- `429` - Too Many Requests
- `500` - Internal Server Error
- `502` - Bad Gateway
- `503` - Service Unavailable
- `504` - Gateway Timeout
- Cualquier código de error que comience con `5xx`

## 📊 Validaciones

### Tamaño de Archivo
- **Límite**: 20MB (límite de Gemini API)
- **Advertencia**: Archivos > 5MB generan warning en logs
- **Rechazo**: Archivos > 20MB se rechazan inmediatamente

### Timeouts Adaptativos
- **Archivos pequeños (< 5MB)**: 400 segundos (6.7 minutos)
- **Archivos grandes (> 5MB)**: 600 segundos (10 minutos)

## 🗂️ Estructura de Errores

### Error de Gemini API
```json
{
  "error": "Error al analizar el examen médico con Gemini AI",
  "error_details": {
    "error_type": "GEMINI_API_ERROR",
    "message": "Error message",
    "code": "ERROR_CODE",
    "status": "HTTP_STATUS",
    "attempts": [...],
    "isRetryable": true/false,
    "pdf_size_mb": "9.10",
    "timestamp": "2025-12-28T..."
  },
  "suggestions": [...]
}
```

### Error de Parseo
```json
{
  "error": "Error al parsear la respuesta de Gemini",
  "error_type": "PARSE_ERROR",
  "raw_response_preview": "...",
  "raw_response_length": 12345,
  "parse_error": "Error message",
  "timestamp": "2025-12-28T..."
}
```

### Error Inesperado
```json
{
  "error": "Error inesperado al analizar el examen médico",
  "error_details": {
    "error_type": "UNEXPECTED_ERROR",
    "message": "Error message",
    "stack": "...",
    "timestamp": "2025-12-28T..."
  }
}
```

## 📝 Logging

### Niveles de Log
- `[Gemini]` - Logs del servicio Gemini
- `[Examenes]` - Logs de la herramienta de exámenes

### Información Registrada
- Tiempo de análisis
- Tamaño del archivo
- Intentos realizados
- Errores capturados
- Códigos de error específicos

## 🔍 Depuración

### Verificar Archivo Problemático
```bash
# Verificar tamaño
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "storage_listar",
      "arguments": {"bucket": "emos-pdf"}
    }
  }' | jq '.result.content[0].text' | jq '.[] | select(.name | contains("NOMBRE"))'
```

### Probar Descarga
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "storage_descargar",
      "arguments": {
        "bucket": "emos-pdf",
        "path": "NOMBRE_ARCHIVO.pdf"
      }
    }
  }' | jq '.result.content[0].text' | head -c 100
```

### Analizar con Retry
El script `analizar-todos-emos.ts ahora incluye:
- Retry automático en descarga
- Retry automático en análisis
- Retry automático en parseo
- Backoff exponencial
- Detección de errores recuperables

## 🚀 Uso

### Análisis Individual
```typescript
// El retry es automático en analyzeDocument
const result = await analyzeDocument(prompt, pdfBase64, false, 3);
```

### Análisis Masivo
```bash
npm run analizar-todos-emos
```

El script maneja automáticamente:
- Reintentos en cada paso
- Errores recuperables
- Timeouts adaptativos
- Logging detallado

## ⚠️ Limitaciones

1. **Tamaño máximo**: 20MB por archivo
2. **Timeout máximo**: 10 minutos por análisis
3. **Intentos máximos**: 3 por operación
4. **Backoff máximo**: 10 segundos entre intentos

## 🔧 Mejoras Futuras

- [ ] Compresión automática de PDFs grandes
- [ ] Reducción de resolución para archivos muy grandes
- [ ] Cache de análisis fallidos para evitar reintentos innecesarios
- [ ] Métricas de éxito/fallo por tipo de error
- [ ] Alertas automáticas para errores recurrentes

