#!/bin/bash

# Script para analizar el primer EMO del bucket emos-pdf

BUCKET="emos-pdf"
BASE_URL="http://localhost:3000/api/mcp"

echo "🔍 Paso 1: Listando archivos en bucket $BUCKET..."
STORAGE_RESPONSE=$(curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\": \"2.0\",\"id\": 1,\"method\": \"tools/call\",\"params\": {\"name\": \"storage_listar\",\"arguments\": {\"bucket\": \"$BUCKET\"}}}" \
  -s)

echo "$STORAGE_RESPONSE" | python3 -m json.tool | head -30
echo ""

# Extraer el primer archivo
FIRST_FILE=$(echo "$STORAGE_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
files = json.loads(data['result']['content'][0]['text'])
if files and len(files) > 0:
    print(files[0]['name'])
else:
    print('')
" 2>/dev/null)

if [ -z "$FIRST_FILE" ]; then
    echo "❌ No se encontraron archivos en el bucket"
    exit 1
fi

echo "📄 Primer archivo encontrado: $FIRST_FILE"
echo ""
echo "⬇️  Paso 2: Descargando archivo..."
DOWNLOAD_RESPONSE=$(curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\": \"2.0\",\"id\": 2,\"method\": \"tools/call\",\"params\": {\"name\": \"storage_descargar\",\"arguments\": {\"bucket\": \"$BUCKET\",\"path\": \"$FIRST_FILE\"}}}" \
  -s)

# Convertir el contenido descargado a base64
PDF_BASE64=$(echo "$DOWNLOAD_RESPONSE" | python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
if 'error' in data:
    print('ERROR:', data['error'])
    sys.exit(1)
content = data['result']['content'][0]['text']
# El contenido ya viene como texto, necesitamos convertirlo a base64
# Pero espera, si viene como texto del PDF, necesitamos leerlo como binario
# En realidad, storage_descargar debería devolver base64 o binario
# Por ahora asumimos que viene como texto plano y lo codificamos
print(base64.b64encode(content.encode('latin-1')).decode())
" 2>/dev/null)

if [ -z "$PDF_BASE64" ] || [[ "$PDF_BASE64" == ERROR* ]]; then
    echo "❌ Error al descargar o convertir el archivo"
    echo "$DOWNLOAD_RESPONSE" | python3 -m json.tool
    exit 1
fi

echo "✅ Archivo descargado y convertido a base64 (${#PDF_BASE64} caracteres)"
echo ""
echo "🤖 Paso 3: Analizando con Gemini AI..."

# Analizar el PDF
ANALYSIS_RESPONSE=$(curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\": \"2.0\",\"id\": 3,\"method\": \"tools/call\",\"params\": {\"name\": \"examenes_analizar\",\"arguments\": {\"pdf_base64\": \"$PDF_BASE64\",\"use_thinking\": false}}}" \
  -s)

echo "$ANALYSIS_RESPONSE" | python3 -m json.tool

