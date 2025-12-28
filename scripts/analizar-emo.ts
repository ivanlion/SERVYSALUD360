#!/usr/bin/env tsx
/**
 * Script TypeScript para analizar un EMO usando el servidor MCP
 * Usa directamente el endpoint MCP sin necesidad de Python
 */

import * as fs from 'fs';
import * as path from 'path';

const MCP_ENDPOINT = "http://localhost:3000/api/mcp";

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

async function callMCP(method: string, params: any, timeout: number = 300): Promise<MCPResponse> {
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    }),
    signal: AbortSignal.timeout(timeout * 1000)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

function printSection(title: string, char: string = "=", width: number = 80): void {
  console.log("\n" + char.repeat(width));
  console.log(`  ${title}`);
  console.log(char.repeat(width));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("  🏥 ANÁLISIS DE EXAMEN MÉDICO OCUPACIONAL (EMO)");
  console.log("=".repeat(80));

  try {
    // Paso 1: Listar archivos
    printSection("PASO 1: Listando archivos en bucket 'emos-pdf'", "─");
    const storageResult = await callMCP("tools/call", {
      name: "storage_listar",
      arguments: { bucket: "emos-pdf" }
    });

    if (storageResult.error) {
      console.error(`❌ Error: ${JSON.stringify(storageResult.error)}`);
      process.exit(1);
    }

    const files = JSON.parse(storageResult.result.content[0].text);
    if (!files || files.length === 0) {
      console.error("❌ No se encontraron archivos en el bucket");
      process.exit(1);
    }

    console.log(`✓ Se encontraron ${files.length} archivo(s)`);

    // Paso 2: Mostrar nombre del primer archivo
    printSection("PASO 2: Archivo seleccionado", "─");
    const firstFile = files[0].name;
    const fileSize = files[0]?.metadata?.size || 0;
    const fileSizeMB = fileSize > 0 ? (fileSize / (1024 * 1024)).toFixed(2) : "desconocido";
    console.log(`📄 Nombre: ${firstFile}`);
    console.log(`📊 Tamaño: ${fileSizeMB} MB`);

    // Paso 3: Descargar archivo
    printSection("PASO 3: Descargando archivo", "─");
    console.log("⏳ Descargando... (esto puede tardar unos segundos)");
    
    const downloadResult = await callMCP("tools/call", {
      name: "storage_descargar",
      arguments: { bucket: "emos-pdf", path: firstFile }
    }, 120);

    if (downloadResult.error) {
      console.error(`❌ Error al descargar: ${JSON.stringify(downloadResult.error)}`);
      process.exit(1);
    }

    const pdfBase64 = downloadResult.result.content[0].text;
    console.log(`✓ Archivo descargado correctamente (${pdfBase64.length.toLocaleString()} caracteres en base64)`);

    // Paso 4: Analizar con Gemini
    printSection("PASO 4: Analizando con Gemini AI", "─");
    console.log("⏳ Analizando documento... (esto puede tardar 60-90 segundos)");
    console.log("   Por favor espere, el análisis está en progreso...");

    const analysisResult = await callMCP("tools/call", {
      name: "examenes_analizar",
      arguments: {
        pdf_base64: pdfBase64,
        use_thinking: false
      }
    }, 400);

    if (analysisResult.error) {
      console.error(`❌ Error al analizar: ${JSON.stringify(analysisResult.error)}`);
      process.exit(1);
    }

    // Paso 5: Mostrar resultados
    printSection("PASO 5: RESULTADOS DEL ANÁLISIS", "=");

    const analysisText = analysisResult.result.content[0].text;
    let analysisData: any;
    
    try {
      analysisData = JSON.parse(analysisText);
    } catch (parseError) {
      console.error("⚠️  Error al parsear los resultados. Mostrando respuesta cruda:");
      console.log("Longitud de respuesta:", analysisText.length);
      console.log("Primeros 1000 caracteres:");
      console.log(analysisText.substring(0, 1000));
      console.log("\nÚltimos 500 caracteres:");
      console.log(analysisText.substring(Math.max(0, analysisText.length - 500)));
      process.exit(1);
    }
    

    // Mostrar resumen clínico si está disponible
    if (analysisData.resumen_clinico) {
      console.log("\n📋 RESUMEN CLÍNICO:");
      console.log("=".repeat(80));
      console.log(analysisData.resumen_clinico);
      console.log("=".repeat(80));
    }

    // Mostrar CSV parseado si está disponible
    if (analysisData.csv_parseado) {
      const csv = analysisData.csv_parseado;
      console.log("\n📊 DATOS ESTRUCTURADOS (CSV):");
      console.log("-".repeat(80));

      // Aptitud
      const aptitud = csv.Aptitud_Final || 'N/A';
      const aptitudEmoji = aptitud === "APTO" ? "✅" : 
                          aptitud.includes("RESTRICCIONES") ? "⚠️" : 
                          aptitud === "NO APTO" ? "❌" : "❓";
      console.log(`${aptitudEmoji} Aptitud Final: ${aptitud}`);

      // Restricciones
      console.log("\n🔒 RESTRICCIONES MÉDICAS:");
      const restrLentes = csv.Restr_Lentes || 'N/A';
      const restrAltura = csv.Restr_Altura_1_8m || csv['Restr_Altura_1.8m'] || 'N/A';
      const restrElec = csv.Restr_Elec || 'N/A';

      let restriccionesCount = 0;
      if (restrLentes === "SI" || restrLentes === "Si" || restrLentes === "si") {
        console.log("  ✓ Uso permanente de lentes correctores");
        restriccionesCount++;
      }
      if (restrAltura === "SI" || restrAltura === "Si" || restrAltura === "si") {
        console.log("  ✓ Restricción para trabajos en altura física mayor a 1,8 metros");
        restriccionesCount++;
      }
      if (restrElec === "SI" || restrElec === "Si" || restrElec === "si") {
        console.log("  ✓ Restricción para trabajar con fibra óptica o cables eléctricos");
        restriccionesCount++;
      }

      if (restriccionesCount === 0) {
        console.log("  (No se encontraron restricciones activas)");
      } else {
        console.log(`\n  📊 Total de restricciones activas: ${restriccionesCount}`);
      }

      // Datos del examen
      console.log("\n📋 DATOS DEL EXAMEN:");
      console.log(`  • Fecha EMO: ${csv.Fecha_EMO || 'N/A'}`);
      console.log(`  • Vencimiento: ${csv.Vencimiento || 'N/A'}`);
      console.log(`  • Centro Médico: ${csv.Centro_Medico || 'N/A'}`);
      console.log(`  • Tipo Examen: ${csv.Tipo_Examen || 'N/A'}`);

      // Datos personales
      console.log("\n👤 DATOS PERSONALES:");
      console.log(`  • DNI: ${csv.DNI || 'N/A'}`);
      console.log(`  • Nombre: ${csv.Nombre || 'N/A'}`);
      console.log(`  • Edad: ${csv.Edad || 'N/A'}`);
      console.log(`  • Sexo: ${csv.Sexo || 'N/A'}`);
      console.log(`  • Puesto: ${csv.Puesto || 'N/A'}`);
      console.log(`  • Empresa: ${csv.Empresa || 'N/A'}`);

      // Mostrar CSV completo truncado si está disponible
      if (analysisData.csv) {
        console.log("\n📄 CSV COMPLETO (truncado):");
        console.log("-".repeat(80));
        const csvPreview = analysisData.csv.length > 1000 
          ? analysisData.csv.substring(0, 1000) + "..." 
          : analysisData.csv;
        console.log(csvPreview);
      }
    } else if (analysisData.aptitud_laboral) {
      // Formato antiguo (compatibilidad)
      const aptitud = analysisData.aptitud_laboral || 'No disponible';
      const aptitudEmoji = aptitud === "APTO" ? "✅" : 
                          aptitud.includes("RESTRICCIONES") ? "⚠️" : 
                          aptitud === "NO APTO" ? "❌" : "❓";
      console.log(`\n${aptitudEmoji} APTITUD LABORAL: ${aptitud || 'No especificada'}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("  ✅ Análisis completado exitosamente");
    console.log("=".repeat(80) + "\n");

  } catch (error: any) {
    console.error("\n❌ Error durante el análisis:");
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar el script
main();

