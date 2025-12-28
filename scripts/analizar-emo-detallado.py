#!/usr/bin/env python3
"""
Script para analizar un EMO paso a paso y mostrar resultados en formato legible
"""

import json
import subprocess
import tempfile
import os
from datetime import datetime

BASE_URL = "http://localhost:3000/api/mcp"

def call_mcp(method, params, timeout=180):
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
            timeout=timeout
        )
        return json.loads(result.stdout)
    finally:
        os.unlink(temp_file)

def print_section(title, char="=", width=80):
    """Imprime un separador de sección"""
    print("\n" + char * width)
    print(f"  {title}")
    print(char * width)

def print_result(label, value, indent=2):
    """Imprime un resultado con formato"""
    spaces = " " * indent
    if isinstance(value, list):
        if value:
            print(f"{spaces}• {label}:")
            for item in value:
                print(f"{spaces}  - {item}")
        else:
            print(f"{spaces}• {label}: (No hay datos)")
    elif isinstance(value, dict):
        if value:
            print(f"{spaces}• {label}:")
            for k, v in value.items():
                if v:
                    print(f"{spaces}  - {k}: {v}")
        else:
            print(f"{spaces}• {label}: (No hay datos)")
    else:
        display_value = value if value else "(No disponible)"
        print(f"{spaces}• {label}: {display_value}")

print("\n" + "="*80)
print("  🏥 ANÁLISIS DE EXAMEN MÉDICO OCUPACIONAL (EMO)")
print("="*80)

# Paso 1: Listar archivos
print_section("PASO 1: Listando archivos en bucket 'emos-pdf'", "─")
storage_result = call_mcp("tools/call", {
    "name": "storage_listar",
    "arguments": {"bucket": "emos-pdf"}
})

if 'error' in storage_result:
    print(f"❌ Error: {storage_result['error']}")
    exit(1)

files = json.loads(storage_result['result']['content'][0]['text'])
if not files:
    print("❌ No se encontraron archivos en el bucket")
    exit(1)

print(f"✓ Se encontraron {len(files)} archivo(s)")

# Paso 2: Mostrar nombre del primer archivo
print_section("PASO 2: Archivo seleccionado", "─")
first_file = files[0]['name']
file_size = files[0].get('metadata', {}).get('size', 0)
file_size_mb = file_size / (1024 * 1024) if file_size else 0
print(f"📄 Nombre: {first_file}")
print(f"📊 Tamaño: {file_size_mb:.2f} MB" if file_size_mb > 0 else "📊 Tamaño: (desconocido)")

# Paso 3: Descargar archivo
print_section("PASO 3: Descargando archivo", "─")
print("⏳ Descargando... (esto puede tardar unos segundos)")
download_result = call_mcp("tools/call", {
    "name": "storage_descargar",
    "arguments": {"bucket": "emos-pdf", "path": first_file}
})

if 'error' in download_result:
    print(f"❌ Error al descargar: {download_result['error']}")
    exit(1)

pdf_base64 = download_result['result']['content'][0]['text']
print(f"✓ Archivo descargado correctamente ({len(pdf_base64):,} caracteres en base64)")

# Paso 4: Analizar con Gemini
print_section("PASO 4: Analizando con Gemini AI", "─")
print("⏳ Analizando documento... (esto puede tardar 30-60 segundos)")
print("   Por favor espere, el análisis está en progreso...")

analysis_result = call_mcp("tools/call", {
    "name": "examenes_analizar",
    "arguments": {
        "pdf_base64": pdf_base64,
        "use_thinking": False
    }
}, timeout=300)

if 'error' in analysis_result:
    print(f"❌ Error al analizar: {analysis_result['error']}")
    exit(1)

# Paso 5: Mostrar resultados
print_section("PASO 5: RESULTADOS DEL ANÁLISIS", "=")

analysis_text = analysis_result['result']['content'][0]['text']
try:
    analysis_data = json.loads(analysis_text)
except json.JSONDecodeError:
    print("⚠️  Error al parsear los resultados. Mostrando respuesta cruda:")
    print(analysis_text[:500])
    exit(1)

# Nuevo formato: resumen_clinico, csv, csv_parseado
if 'resumen_clinico' in analysis_data:
    # Mostrar resumen clínico
    print("\n📋 RESUMEN CLÍNICO:")
    print("=" * 80)
    print(analysis_data['resumen_clinico'])
    print("=" * 80)
    
    # Mostrar CSV parseado si está disponible
    if 'csv_parseado' in analysis_data and analysis_data['csv_parseado']:
        csv = analysis_data['csv_parseado']
        print("\n📊 DATOS ESTRUCTURADOS (CSV):")
        print("-" * 80)
        
        # Aptitud
        aptitud = csv.get('Aptitud_Final', 'N/A')
        aptitud_emoji = "✅" if aptitud == "APTO" else "⚠️" if "RESTRICCIONES" in aptitud else "❌" if aptitud == "NO APTO" else "❓"
        print(f"{aptitud_emoji} Aptitud Final: {aptitud}")
        
        # Restricciones
        print("\n🔒 RESTRICCIONES MÉDICAS:")
        restr_lentes = csv.get('Restr_Lentes', 'N/A')
        restr_altura = csv.get('Restr_Altura_1.8m', 'N/A')
        restr_elec = csv.get('Restr_Elec', 'N/A')
        
        if restr_lentes == "SI":
            print("  ✓ Uso permanente de lentes correctores")
        if restr_altura == "SI":
            print("  ✓ Restricción para trabajos en altura física mayor a 1,8 metros")
        if restr_elec == "SI":
            print("  ✓ Restricción para trabajar con fibra óptica o cables eléctricos")
        
        if restr_lentes != "SI" and restr_altura != "SI" and restr_elec != "SI":
            print("  (No se encontraron restricciones activas)")
        
        # Datos importantes
        print("\n📋 DATOS DEL EXAMEN:")
        print(f"  • Fecha EMO: {csv.get('Fecha_EMO', 'N/A')}")
        print(f"  • Vencimiento: {csv.get('Vencimiento', 'N/A')}")
        print(f"  • Centro Médico: {csv.get('Centro_Medico', 'N/A')}")
        print(f"  • Tipo Examen: {csv.get('Tipo_Examen', 'N/A')}")
        
        print("\n👤 DATOS PERSONALES:")
        print(f"  • DNI: {csv.get('DNI', 'N/A')}")
        print(f"  • Nombre: {csv.get('Nombre', 'N/A')}")
        print(f"  • Edad: {csv.get('Edad', 'N/A')}")
        print(f"  • Sexo: {csv.get('Sexo', 'N/A')}")
        print(f"  • Puesto: {csv.get('Puesto', 'N/A')}")
        print(f"  • Empresa: {csv.get('Empresa', 'N/A')}")
        
        # Mostrar CSV completo si está disponible
        if 'csv' in analysis_data and analysis_data['csv']:
            print("\n📄 CSV COMPLETO:")
            print("-" * 80)
            print(analysis_data['csv'][:1000] + "..." if len(analysis_data['csv']) > 1000 else analysis_data['csv'])
    
elif 'aptitud_laboral' in analysis_data:
    # Formato antiguo (compatibilidad)
    aptitud = analysis_data.get('aptitud_laboral', 'No disponible')
    aptitud_emoji = "✅" if aptitud == "APTO" else "⚠️" if "RESTRICCIONES" in aptitud else "❌" if aptitud == "NO APTO" else "❓"
    print(f"\n{aptitud_emoji} APTITUD LABORAL: {aptitud if aptitud else 'No especificada'}")

# Restricciones médicas (solo si es formato antiguo)
if 'restricciones_medicas' in analysis_data and not 'resumen_clinico' in analysis_data:
    print_section("RESTRICCIONES MÉDICAS", "─")
    restricciones = analysis_data.get('restricciones_medicas', [])
    if restricciones:
        for i, restriccion in enumerate(restricciones, 1):
            print(f"  {i}. {restriccion}")
    else:
        print("  (No se encontraron restricciones médicas)")

# Resto de secciones (solo formato antiguo)
if 'hallazgos_principales' in analysis_data and not 'resumen_clinico' in analysis_data:
    print_section("HALLAZGOS PRINCIPALES", "─")
    hallazgos = analysis_data.get('hallazgos_principales', [])
    if hallazgos:
        for i, hallazgo in enumerate(hallazgos[:15], 1):
            print(f"  {i}. {hallazgo}")
        if len(hallazgos) > 15:
            print(f"  ... y {len(hallazgos) - 15} hallazgo(s) adicional(es)")
    else:
        print("  (No se encontraron hallazgos)")

    # Espirometría y Audiometría (formato antiguo)
    print_section("ESPIROMETRÍA", "─")
    espirometria = analysis_data.get('espirometria', {})
    if espirometria.get('presente', False):
        print("  ✓ Espirometría presente en el examen")
        if espirometria.get('fev1'):
            print(f"    • FEV1: {espirometria['fev1']}")
        if espirometria.get('fvc'):
            print(f"    • FVC: {espirometria['fvc']}")
        if espirometria.get('fev1_fvc'):
            print(f"    • FEV1/FVC: {espirometria['fev1_fvc']}")
    else:
        print("  (Espirometría no presente en el examen)")

    print_section("AUDIOMETRÍA", "─")
    audiometria = analysis_data.get('audiometria', {})
    if audiometria.get('presente', False):
        print("  ✓ Audiometría presente en el examen")
        if audiometria.get('interpretacion'):
            print(f"    • Interpretación: {audiometria['interpretacion']}")
    else:
        print("  (Audiometría no presente en el examen)")

    print_section("INFORMACIÓN ADICIONAL", "─")
    if analysis_data.get('fecha_examen'):
        print(f"  📅 Fecha del examen: {analysis_data['fecha_examen']}")
    if analysis_data.get('medico_emisor'):
        print(f"  👨‍⚕️  Médico emisor: {analysis_data['medico_emisor']}")

print("\n" + "="*80)
print("  ✅ Análisis completado exitosamente")
print("="*80 + "\n")

