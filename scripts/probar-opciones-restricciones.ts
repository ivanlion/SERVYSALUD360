#!/usr/bin/env tsx
/**
 * Script para probar las tres opciones de prompts para extracción de restricciones
 */

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

async function probarOpcion(numero: number): Promise<{ restr_lentes: string; restr_altura: string; restr_elec: string } | null> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 PROBANDO OPCIÓN ${numero}`);
  console.log('='.repeat(80));

  try {
    // Listar archivos
    const storageResult = await callMCP("tools/call", {
      name: "storage_listar",
      arguments: { bucket: "emos-pdf" }
    });

    const files = JSON.parse(storageResult.result.content[0].text);
    const firstFile = files[0].name;

    // Descargar
    const downloadResult = await callMCP("tools/call", {
      name: "storage_descargar",
      arguments: { bucket: "emos-pdf", path: firstFile }
    }, 120);

    const pdfBase64 = downloadResult.result.content[0].text;
    console.log(`✓ Archivo descargado: ${firstFile}`);

    // Analizar - NOTA: Necesitamos modificar el código del servidor para cambiar la opción
    // Por ahora probaremos manualmente editando el archivo
    console.log(`⏳ Analizando con Opción ${numero}...`);
    
    const analysisResult = await callMCP("tools/call", {
      name: "examenes_analizar",
      arguments: {
        pdf_base64: pdfBase64,
        use_thinking: false
      }
    }, 400);

    if (analysisResult.error) {
      console.error(`❌ Error: ${JSON.stringify(analysisResult.error)}`);
      return null;
    }

    const analysisData = JSON.parse(analysisResult.result.content[0].text);
    
    if (analysisData.csv_parseado) {
      const csv = analysisData.csv_parseado;
      return {
        restr_lentes: csv.Restr_Lentes || 'N/A',
        restr_altura: csv.Restr_Altura_1_8m || csv['Restr_Altura_1.8m'] || 'N/A',
        restr_elec: csv.Restr_Elec || 'N/A'
      };
    }

    return null;
  } catch (error: any) {
    console.error(`❌ Error en Opción ${numero}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("  🧪 PRUEBA DE TRES OPCIONES DE PROMPTS PARA RESTRICCIONES");
  console.log("=".repeat(80));
  console.log("\nNOTA: Este script requiere modificar manualmente el prompt en:");
  console.log("mcp-server/src/tools/examenes.ts");
  console.log("\nCambia 'OPCIÓN_1' por 'OPCIÓN_2' o 'OPCIÓN_3' según corresponda.\n");

  // Probar opción actual
  const resultado = await probarOpcion(1);
  
  if (resultado) {
    console.log("\n📊 RESULTADOS:");
    console.log(`  Restr_Lentes: ${resultado.restr_lentes}`);
    console.log(`  Restr_Altura_1.8m: ${resultado.restr_altura}`);
    console.log(`  Restr_Elec: ${resultado.restr_elec}`);
    
    const totalSI = [resultado.restr_lentes, resultado.restr_altura, resultado.restr_elec]
      .filter(r => r === 'SI').length;
    console.log(`\n  Total con "SI": ${totalSI}/3 (esperado: 1/3)`);
  }
}

main();


