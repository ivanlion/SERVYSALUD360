#!/bin/bash

# Script para probar todas las herramientas MCP disponibles
# Uso: ./scripts/test-mcp-tools.sh

BASE_URL="http://localhost:3000/api/mcp"

echo "🔍 Probando herramientas MCP..."
echo ""

# 1. Listar herramientas
echo "1️⃣ Listando herramientas disponibles..."
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0","id": 1,"method": "tools/list"}' \
  -s | python3 -m json.tool | head -30
echo ""
echo "---"
echo ""

# 2. Probar casos_listar
echo "2️⃣ Probando casos_listar..."
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0","id": 2,"method": "tools/call","params": {"name": "casos_listar","arguments": {"limit": 3}}}' \
  -s | python3 -m json.tool
echo ""
echo "---"
echo ""

# 3. Probar trabajadores_listar
echo "3️⃣ Probando trabajadores_listar..."
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0","id": 3,"method": "tools/call","params": {"name": "trabajadores_listar","arguments": {"limit": 3}}}' \
  -s | python3 -m json.tool
echo ""
echo "---"
echo ""

# 4. Probar storage_listar
echo "4️⃣ Probando storage_listar..."
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0","id": 4,"method": "tools/call","params": {"name": "storage_listar","arguments": {"bucket": "emos-pdf"}}}' \
  -s | python3 -m json.tool
echo ""
echo "---"
echo ""

echo "✅ Pruebas completadas"

