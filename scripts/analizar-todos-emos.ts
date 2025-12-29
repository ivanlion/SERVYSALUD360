#!/usr/bin/env tsx
/**
 * Script para analizar TODOS los EMOs del bucket emos-pdf
 * Genera un resumen estadístico completo
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

interface EMOAnalysis {
  archivo: string;
  aptitud: string;
  restricciones: {
    lentes: string;
    altura: string;
    electricidad: string;
  };
  restriccionesCount: number;
  hallazgos: string[];
  espirometria?: string;
  audiometria?: string;
  datosCompletos: any;
  error?: string;
}

interface SummaryStats {
  total: number;
  aptos: number;
  aptosConRestricciones: number;
  noAptos: number;
  restriccionesCount: {
    lentes: number;
    altura: number;
    electricidad: number;
  };
  confianzaPromedio: number;
  errores: number;
}

async function callMCP(method: string, params: any, timeout: number = 300): Promise<MCPResponse> {
  try {
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
      // Intentar obtener el cuerpo de la respuesta para más detalles
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {
        // Ignorar si no se puede leer el cuerpo
      }
      
      const error = new Error(`HTTP error! status: ${response.status}${errorBody ? ` - ${errorBody.substring(0, 200)}` : ''}`) as any;
      error.status = response.status;
      error.statusText = response.statusText;
      throw error;
    }

    return await response.json();
  } catch (error: any) {
    // Mejorar el mensaje de error para timeouts
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      const timeoutError = new Error(`Timeout después de ${timeout} segundos`) as any;
      timeoutError.code = 'ETIMEDOUT';
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    
    // Re-lanzar el error con más contexto
    if (error?.message) {
      throw error;
    }
    
    throw new Error(`Error desconocido en callMCP: ${String(error)}`);
  }
}

function printProgress(current: number, total: number, fileName: string): void {
  const percentage = Math.round((current / total) * 100);
  const barLength = 40;
  const filled = Math.round((current / total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  
  process.stdout.write(`\r[${bar}] ${percentage}% | ${current}/${total} | ${fileName.substring(0, 40).padEnd(40)}`);
}

function printSection(title: string, char: string = "=", width: number = 80): void {
  console.log("\n" + char.repeat(width));
  console.log(`  ${title}`);
  console.log(char.repeat(width));
}

async function analyzeEMO(fileName: string, index: number, total: number, maxRetries: number = 3): Promise<EMOAnalysis> {
  printProgress(index, total, fileName);
  
  let lastError: any = null;
  
  // Retry logic con backoff exponencial
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Descargar archivo
      const downloadResult = await callMCP("tools/call", {
        name: "storage_descargar",
        arguments: { bucket: "emos-pdf", path: fileName }
      }, 120);

      if (downloadResult.error) {
        lastError = {
          type: 'DOWNLOAD_ERROR',
          message: `Error al descargar: ${JSON.stringify(downloadResult.error)}`,
          attempt
        };
        
        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        
        return {
          archivo: fileName,
          aptitud: "ERROR",
          restricciones: { lentes: "N/A", altura: "N/A", electricidad: "N/A" },
          restriccionesCount: 0,
          hallazgos: [],
          datosCompletos: {},
          error: lastError.message
        };
      }

      const pdfBase64 = downloadResult.result.content[0].text;
      const pdfSizeMB = ((pdfBase64.length * 3) / 4) / (1024 * 1024);
      
      if (pdfSizeMB > 20) {
        return {
          archivo: fileName,
          aptitud: "ERROR",
          restricciones: { lentes: "N/A", altura: "N/A", electricidad: "N/A" },
          restriccionesCount: 0,
          hallazgos: [],
          datosCompletos: {},
          error: `Archivo demasiado grande: ${pdfSizeMB.toFixed(2)}MB (límite: 20MB)`
        };
      }

      // Analizar con Gemini (con timeout más largo para archivos grandes)
      const timeout = pdfSizeMB > 5 ? 600 : 400; // 10 minutos para archivos grandes
      const analysisResult = await callMCP("tools/call", {
        name: "examenes_analizar",
        arguments: {
          pdf_base64: pdfBase64,
          use_thinking: false
        }
      }, timeout);

      if (analysisResult.error) {
        lastError = {
          type: 'ANALYSIS_ERROR',
          message: `Error al analizar: ${JSON.stringify(analysisResult.error)}`,
          attempt,
          error_details: analysisResult.error
        };
        
        // Si es un error recuperable y no es el último intento, reintentar
        const isRetryable = analysisResult.error?.code === 500 || 
                          analysisResult.error?.code === 429 ||
                          analysisResult.error?.code === 503 ||
                          analysisResult.error?.message?.includes('timeout');
        
        if (isRetryable && attempt < maxRetries) {
          const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
          console.log(`\n⚠️  Error recuperable en intento ${attempt}/${maxRetries}. Reintentando en ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        
        return {
          archivo: fileName,
          aptitud: "ERROR",
          restricciones: { lentes: "N/A", altura: "N/A", electricidad: "N/A" },
          restriccionesCount: 0,
          hallazgos: [],
          datosCompletos: {},
          error: lastError.message
        };
      }

      const analysisText = analysisResult.result.content[0].text;
      let analysisData: any;
      
      try {
        analysisData = JSON.parse(analysisText);
      } catch (parseError) {
        lastError = {
          type: 'PARSE_ERROR',
          message: `Error al parsear respuesta: ${parseError}`,
          attempt
        };
        
        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        
        return {
          archivo: fileName,
          aptitud: "ERROR",
          restricciones: { lentes: "N/A", altura: "N/A", electricidad: "N/A" },
          restriccionesCount: 0,
          hallazgos: [],
          datosCompletos: {},
          error: lastError.message
        };
      }

      const csv = analysisData.csv_parseado || {};
      const aptitud = csv.Aptitud_Final || 'N/A';
      const restrLentes = csv.Restr_Lentes || 'NO';
      const restrAltura = csv.Restr_Altura_1_8m || csv['Restr_Altura_1.8m'] || 'NO';
      const restrElec = csv.Restr_Elec || 'NO';

      let restriccionesCount = 0;
      if (restrLentes === "SI" || restrLentes === "Si" || restrLentes === "si") restriccionesCount++;
      if (restrAltura === "SI" || restrAltura === "Si" || restrAltura === "si") restriccionesCount++;
      if (restrElec === "SI" || restrElec === "Si" || restrElec === "si") restriccionesCount++;

      const hallazgos: string[] = [];
      if (analysisData.resumen_clinico) {
        const resumen = analysisData.resumen_clinico.toLowerCase();
        if (resumen.includes('bradicardia')) hallazgos.push('Bradicardia');
        if (resumen.includes('taquicardia')) hallazgos.push('Taquicardia');
        if (resumen.includes('hipertensión') || resumen.includes('hipertension')) hallazgos.push('Hipertensión');
        if (resumen.includes('diabetes')) hallazgos.push('Diabetes');
        if (resumen.includes('obesidad')) hallazgos.push('Obesidad');
        if (resumen.includes('anemia')) hallazgos.push('Anemia');
      }

      // Si llegamos aquí, el análisis fue exitoso
      // Si llegamos aquí, el análisis fue exitoso
    } catch (error: any) {
      lastError = {
        type: 'UNEXPECTED_ERROR',
        message: error?.message || error?.toString() || String(error) || 'Error desconocido',
        attempt,
        stack: error?.stack,
        name: error?.name,
        code: error?.code
      };
      
      // Log detallado del error
      console.error(`\n[Error en ${fileName}, intento ${attempt}/${maxRetries}]:`, {
        type: lastError.type,
        message: lastError.message,
        name: lastError.name,
        code: lastError.code
      });
      
      // Si no es el último intento y el error parece recuperable, reintentar
      if (attempt < maxRetries) {
        const isRetryable = error?.message?.includes('timeout') || 
                           error?.message?.includes('ECONNRESET') ||
                           error?.message?.includes('ETIMEDOUT') ||
                           error?.message?.includes('500') ||
                           error?.code === 'ECONNREFUSED' ||
                           error?.code === 'ETIMEDOUT';
        
        if (isRetryable) {
          const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
          console.log(`⚠️  Error recuperable. Reintentando en ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
      }
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  const errorMessage = lastError?.message || 'Error desconocido';
  const errorDetails = lastError?.code ? ` (${lastError.code})` : '';
  
  return {
    archivo: fileName,
    aptitud: "ERROR",
    restricciones: { lentes: "N/A", altura: "N/A", electricidad: "N/A" },
    restriccionesCount: 0,
    hallazgos: [],
    datosCompletos: {},
    error: `Error después de ${maxRetries} intentos: ${errorMessage}${errorDetails}`
  };
}

function generateSummary(analyses: EMOAnalysis[]): SummaryStats {
  const stats: SummaryStats = {
    total: analyses.length,
    aptos: 0,
    aptosConRestricciones: 0,
    noAptos: 0,
    restriccionesCount: {
      lentes: 0,
      altura: 0,
      electricidad: 0
    },
    confianzaPromedio: 0,
    errores: 0
  };

  analyses.forEach(analysis => {
    if (analysis.error) {
      stats.errores++;
      return;
    }

    const aptitud = analysis.aptitud.toUpperCase();
    
    if (aptitud === "APTO") {
      stats.aptos++;
      if (analysis.restriccionesCount > 0) {
        stats.aptosConRestricciones++;
      }
    } else if (aptitud.includes("NO APTO") || aptitud === "NO APTO") {
      stats.noAptos++;
    }

    if (analysis.restricciones.lentes === "SI") stats.restriccionesCount.lentes++;
    if (analysis.restricciones.altura === "SI") stats.restriccionesCount.altura++;
    if (analysis.restricciones.electricidad === "SI") stats.restriccionesCount.electricidad++;
  });

  // Calcular confianza promedio (asumiendo que los análisis exitosos tienen alta confianza)
  const exitosos = analyses.filter(a => !a.error).length;
  stats.confianzaPromedio = exitosos > 0 ? Math.round((exitosos / analyses.length) * 100) : 0;

  return stats;
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("  🏥 ANÁLISIS MASIVO DE EXAMENES MÉDICOS OCUPACIONALES (EMO)");
  console.log("=".repeat(80));

  try {
    // Paso 1: Listar todos los archivos
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

    console.log(`✓ Se encontraron ${files.length} archivo(s) para analizar\n`);

    // Paso 2: Analizar cada archivo
    printSection(`PASO 2: Analizando ${files.length} EMO(s)`, "─");
    console.log("⏳ Esto puede tardar varios minutos...\n");

    const analyses: EMOAnalysis[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i].name;
      const analysis = await analyzeEMO(fileName, i + 1, files.length);
      analyses.push(analysis);
      
      // Pequeña pausa para no sobrecargar el servidor
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log("\n"); // Nueva línea después de la barra de progreso

    // Guardar resultados en archivo
    const resultsDir = path.join(process.cwd(), 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const resultsFile = path.join(resultsDir, `analisis-emos-${timestamp}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(analyses, null, 2));
    console.log(`✓ Resultados guardados en: ${resultsFile}`);

    // Paso 3: Generar resumen
    printSection("PASO 3: RESUMEN ESTADÍSTICO", "=");
    
    const stats = generateSummary(analyses);
    const exitosos = stats.total - stats.errores;

    console.log(`\n📊 ESTADÍSTICAS GENERALES:`);
    console.log(`   Total de EMOs analizados: ${stats.total}`);
    console.log(`   Análisis exitosos: ${exitosos}`);
    console.log(`   Errores: ${stats.errores}`);

    if (exitosos > 0) {
      console.log(`\n✅ APTITUD LABORAL:`);
      console.log(`   APTOS: ${stats.aptos} (${Math.round((stats.aptos / exitosos) * 100)}%)`);
      console.log(`   APTOS CON RESTRICCIONES: ${stats.aptosConRestricciones} (${Math.round((stats.aptosConRestricciones / exitosos) * 100)}%)`);
      console.log(`   NO APTOS: ${stats.noAptos} (${Math.round((stats.noAptos / exitosos) * 100)}%)`);

      console.log(`\n🔒 RESTRICCIONES MÁS COMUNES:`);
      const restricciones = [
        { nombre: "Uso permanente de lentes correctores", count: stats.restriccionesCount.lentes },
        { nombre: "Restricción para trabajos en altura > 1.8m", count: stats.restriccionesCount.altura },
        { nombre: "Restricción para fibra óptica/cables eléctricos", count: stats.restriccionesCount.electricidad }
      ].sort((a, b) => b.count - a.count);

      restricciones.forEach((r, index) => {
        if (r.count > 0) {
          console.log(`   ${index + 1}. ${r.nombre}: ${r.count} (${Math.round((r.count / exitosos) * 100)}%)`);
        }
      });

      console.log(`\n📈 CALIDAD DEL ANÁLISIS:`);
      console.log(`   Promedio de confianza: ${stats.confianzaPromedio}%`);
      console.log(`   Tasa de éxito: ${Math.round((exitosos / stats.total) * 100)}%`);
    }

    // Detalle por archivo
    printSection("DETALLE POR ARCHIVO", "─");
    analyses.forEach((analysis, index) => {
      const emoji = analysis.error ? "❌" : 
                   analysis.aptitud === "APTO" ? "✅" : 
                   analysis.aptitud.includes("NO APTO") ? "🚫" : "⚠️";
      
      console.log(`\n${emoji} ${index + 1}. ${analysis.archivo}`);
      if (analysis.error) {
        console.log(`   Error: ${analysis.error}`);
      } else {
        console.log(`   Aptitud: ${analysis.aptitud}`);
        console.log(`   Restricciones: ${analysis.restriccionesCount}`);
        if (analysis.restriccionesCount > 0) {
          if (analysis.restricciones.lentes === "SI") console.log(`     - Lentes correctores`);
          if (analysis.restricciones.altura === "SI") console.log(`     - Altura > 1.8m`);
          if (analysis.restricciones.electricidad === "SI") console.log(`     - Fibra óptica/Eléctrica`);
        }
      }
    });

    console.log("\n" + "=".repeat(80));
    console.log("  ✅ Análisis masivo completado exitosamente");
    console.log("=".repeat(80) + "\n");

  } catch (error: any) {
    console.error("\n❌ Error durante el análisis masivo:");
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar el script
main();

