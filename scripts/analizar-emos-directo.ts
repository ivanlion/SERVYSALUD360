#!/usr/bin/env tsx
/**
 * Script para analizar EMOs directamente con Gemini API
 * Sin usar el servidor MCP - Llamadas directas
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from 'fs';
import * as path from 'path';
import { analyzePDFDirect } from '../lib/services/gemini-client';
import { EMO_ANALYSIS_PROMPT } from '../lib/prompts/emo-analysis';

// Cargar variables de entorno desde .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    });
  }
}

loadEnv();

// Validar variables requeridas
if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
  throw new Error('NEXT_PUBLIC_GEMINI_API_KEY no está configurada en .env.local');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurada en .env.local');
}

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada en .env.local');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey
);

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
  confianza?: number;
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

/**
 * Analiza un EMO directamente con Gemini API usando el cliente compartido
 */
async function analizarEMO(
  pdfBase64: string,
  fileName: string,
  maxRetries: number = 3
): Promise<EMOAnalysis> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Usar el cliente compartido de Gemini
      const responseText = await analyzePDFDirect(pdfBase64, EMO_ANALYSIS_PROMPT, maxRetries);

      // Parsear la respuesta
      let analysisData: any;
      try {
        // Intentar parsear como JSON primero
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
        } else {
          // Si no es JSON, parsear el formato CSV del prompt
          const csvSection = responseText.split('PARTE 2:')[1] || responseText;
          const csvLines = csvSection.split('\n').filter(line => line.trim());
          
          let headerLineIndex = -1;
          for (let i = 0; i < csvLines.length; i++) {
            if (csvLines[i]?.includes('Fecha_EMO') && csvLines[i]?.includes('Centro_Medico')) {
              headerLineIndex = i;
              break;
            }
          }

          if (headerLineIndex >= 0 && csvLines.length > headerLineIndex + 1) {
            const headers = csvLines[headerLineIndex]?.split(';').map(h => h.trim()).filter(h => h) || [];
            const values = csvLines[headerLineIndex + 1]?.split(';').map(v => v.trim()) || [];
            
            analysisData = {
              csv_parseado: {},
              resumen_clinico: responseText.split('PARTE 2:')[0]?.trim() || responseText
            };

            if (headers.length > 0 && values.length > 0) {
              headers.forEach((header, index) => {
                if (header && analysisData.csv_parseado) {
                  analysisData.csv_parseado[header] = values[index] || '';
                }
              });
            }
          } else {
            throw new Error('No se pudo encontrar el CSV en la respuesta');
          }
        }
      } catch (parseError) {
        if (attempt < maxRetries) {
          lastError = {
            type: 'PARSE_ERROR',
            message: `Error al parsear respuesta: ${parseError}`,
            attempt
          };
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        throw parseError;
      }

      // Extraer datos del CSV parseado
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

      return {
        archivo: fileName,
        aptitud: aptitud.toUpperCase(),
        restricciones: {
          lentes: restrLentes.toUpperCase(),
          altura: restrAltura.toUpperCase(),
          electricidad: restrElec.toUpperCase()
        },
        restriccionesCount,
        hallazgos,
        espirometria: csv.Espiro_Conclusion || 'N/A',
        audiometria: csv.Dx_Audio || 'N/A',
        datosCompletos: analysisData,
        confianza: 85 // Confianza por defecto cuando es exitoso
      };

    } catch (error: any) {
      lastError = {
        type: 'ANALYSIS_ERROR',
        message: error?.message || String(error),
        attempt,
        code: error?.code
      };

      if (attempt < maxRetries) {
        const isRetryable = error?.message?.includes('timeout') || 
                           error?.message?.includes('ECONNRESET') ||
                           error?.message?.includes('ETIMEDOUT') ||
                           error?.code === 429 ||
                           error?.code === 500 ||
                           error?.code === 503;

        if (isRetryable) {
          const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
          console.log(`\n⚠️  Error recuperable en ${fileName} (intento ${attempt}/${maxRetries}). Reintentando en ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
      }
    }
  }

  // Si llegamos aquí, todos los intentos fallaron
  return {
    archivo: fileName,
    aptitud: "ERROR",
    restricciones: { lentes: "N/A", altura: "N/A", electricidad: "N/A" },
    restriccionesCount: 0,
    hallazgos: [],
    datosCompletos: {},
    error: `Error después de ${maxRetries} intentos: ${lastError?.message || 'Error desconocido'}`,
    confianza: 0
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

  let totalConfianza = 0;
  let exitosos = 0;

  analyses.forEach(analysis => {
    if (analysis.error) {
      stats.errores++;
      return;
    }

    exitosos++;
    if (analysis.confianza) {
      totalConfianza += analysis.confianza;
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

  stats.confianzaPromedio = exitosos > 0 ? Math.round(totalConfianza / exitosos) : 0;

  return stats;
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("  🏥 ANÁLISIS DIRECTO DE EXAMENES MÉDICOS OCUPACIONALES (EMO)");
  console.log("  📡 Llamadas directas a Gemini API (sin MCP)");
  console.log("=".repeat(80));

  try {
    // Paso 1: Listar archivos
    printSection("PASO 1: Listando archivos en bucket 'emos-pdf'", "─");
    const { data: files, error: listError } = await supabase.storage
      .from('emos-pdf')
      .list();

    if (listError) {
      console.error(`❌ Error al listar archivos: ${listError.message}`);
      process.exit(1);
    }

    if (!files || files.length === 0) {
      console.error("❌ No se encontraron archivos en el bucket");
      process.exit(1);
    }

    console.log(`✓ Se encontraron ${files.length} archivo(s) para analizar\n`);

    // Paso 2: Analizar cada archivo
    printSection(`PASO 2: Analizando ${files.length} EMO(s) directamente con Gemini`, "─");
    console.log("⏳ Esto puede tardar varios minutos...\n");

    const analyses: EMOAnalysis[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      printProgress(i + 1, files.length, file.name);

      try {
        // Descargar archivo
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('emos-pdf')
          .download(file.name);

        if (downloadError || !fileData) {
          analyses.push({
            archivo: file.name,
            aptitud: "ERROR",
            restricciones: { lentes: "N/A", altura: "N/A", electricidad: "N/A" },
            restriccionesCount: 0,
            hallazgos: [],
            datosCompletos: {},
            error: `Error al descargar: ${downloadError?.message || 'Archivo no encontrado'}`,
            confianza: 0
          });
          continue;
        }

        // Convertir a base64
        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        // Validar tamaño
        const sizeInMB = (base64.length * 3) / 4 / (1024 * 1024);
        if (sizeInMB > 20) {
          analyses.push({
            archivo: file.name,
            aptitud: "ERROR",
            restricciones: { lentes: "N/A", altura: "N/A", electricidad: "N/A" },
            restriccionesCount: 0,
            hallazgos: [],
            datosCompletos: {},
            error: `Archivo demasiado grande: ${sizeInMB.toFixed(2)}MB (límite: 20MB)`,
            confianza: 0
          });
          continue;
        }

        // Analizar con Gemini
        const analysis = await analizarEMO(base64, file.name, 3);
        analyses.push(analysis);

        // Pequeña pausa para no sobrecargar la API
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        analyses.push({
          archivo: file.name,
          aptitud: "ERROR",
          restricciones: { lentes: "N/A", altura: "N/A", electricidad: "N/A" },
          restriccionesCount: 0,
          hallazgos: [],
          datosCompletos: {},
          error: error?.message || String(error),
          confianza: 0
        });
      }
    }

    console.log("\n"); // Nueva línea después de la barra de progreso

    // Guardar resultados
    const resultsDir = path.join(process.cwd(), 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const resultsFile = path.join(resultsDir, `analisis-emos-directo-${timestamp}.json`);
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

      console.log(`\n🔒 TOP 5 RESTRICCIONES MÁS COMUNES:`);
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
      console.log(`   Modelo utilizado: Gemini 2.0 Flash`);
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
        if (analysis.confianza) {
          console.log(`   Confianza: ${analysis.confianza}%`);
        }
      }
    });

    console.log("\n" + "=".repeat(80));
    console.log("  ✅ Análisis directo completado exitosamente");
    console.log("=".repeat(80) + "\n");

  } catch (error: any) {
    console.error("\n❌ Error durante el análisis directo:");
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar el script
main();

