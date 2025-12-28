#!/usr/bin/env python3
"""
Script para analizar el primer EMO del bucket emos-pdf
"""

import json
import subprocess
import tempfile
import os

BASE_URL = "http://localhost:3000/api/mcp"

def call_mcp(method, params):
    """Llama a una herramienta MCP"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params
        }, f)
        temp_file = f.name
    
    try:
        result = subprocess.run(
            ["curl", "-X", "POST", BASE_URL, "-H", "Content-Type: application/json", "-d", f"@{temp_file}", "-s"],
            capture_output=True,
            text=True,
            timeout=180
        )
        return json.loads(result.stdout)
    finally:
        os.unlink(temp_file)

print("🔍 Paso 1: Listando archivos en bucket emos-pdf...")
storage_result = call_mcp("tools/call", {
    "name": "storage_listar",
    "arguments": {"bucket": "emos-pdf"}
})

files = json.loads(storage_result['result']['content'][0]['text'])
if not files:
    print("❌ No se encontraron archivos")
    exit(1)

first_file = files[0]['name']
print(f"📄 Primer archivo encontrado: {first_file}\n")

print("⬇️  Paso 2: Descargando archivo...")
download_result = call_mcp("tools/call", {
    "name": "storage_descargar",
    "arguments": {"bucket": "emos-pdf", "path": first_file}
})

if 'error' in download_result:
    print("❌ Error al descargar:", download_result['error'])
    exit(1)

pdf_base64 = download_result['result']['content'][0]['text']
print(f"✅ Archivo descargado en base64 ({len(pdf_base64):,} caracteres)\n")

print("🤖 Paso 3: Analizando con Gemini AI (esto puede tardar 30-60 segundos)...")
analysis_result = call_mcp("tools/call", {
    "name": "examenes_analizar",
    "arguments": {
        "pdf_base64": pdf_base64,
        "use_thinking": False
    }
})

print("\n📊 Resultados del análisis:")
print("=" * 80)
if 'error' in analysis_result:
    print(json.dumps(analysis_result, indent=2, ensure_ascii=False))
else:
    analysis_text = analysis_result['result']['content'][0]['text']
    try:
        analysis_data = json.loads(analysis_text)
        print(json.dumps(analysis_data, indent=2, ensure_ascii=False))
    except json.JSONDecodeError as e:
        print("⚠️  Error al parsear JSON, mostrando respuesta cruda:")
        print(analysis_text[:1000])
        print(f"\n... (error: {e})")
print("=" * 80)

