#!/bin/bash

# Script para testear el endpoint MCP
# Uso: ./test-mcp-api.sh

echo "🔍 Testeando endpoint /api/mcp..."
echo "📋 Request: Listar herramientas disponibles"
echo ""

curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }' \
  -w "\n\n📊 Status Code: %{http_code}\n⏱️  Time: %{time_total}s\n"

echo ""
echo "✅ Test completado"

