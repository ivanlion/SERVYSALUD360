#!/usr/bin/env tsx
/**
 * Generador de Reporte de Vigilancia Médica Ocupacional
 * 
 * Genera un reporte profesional basado en los análisis de EMOs
 * 
 * @module scripts/generar-reporte-vigilancia
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

interface ReportData {
  empresa: string;
  fecha: string;
  totalTrabajadores: number;
  aptos: number;
  aptosConRestricciones: number;
  noAptos: number;
  restricciones: {
    lentes: number;
    altura: number;
    electricidad: number;
  };
  hallazgosComunes: { [key: string]: number };
  recomendaciones: string[];
}

/**
 * Carga los resultados de análisis más recientes
 */
function loadLatestAnalysis(): EMOAnalysis[] {
  const resultsDir = path.join(__dirname, '../results');
  
  if (!fs.existsSync(resultsDir)) {
    throw new Error('No se encontró el directorio de resultados. Ejecuta primero el análisis de EMOs.');
  }

  const files = fs.readdirSync(resultsDir)
    .filter(f => f.startsWith('analisis-emos-directo-') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(resultsDir, f),
      time: fs.statSync(path.join(resultsDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    throw new Error('No se encontraron archivos de análisis. Ejecuta primero el análisis de EMOs.');
  }

  const latestFile = files[0];
  console.log(`📄 Cargando resultados de: ${latestFile.name}`);
  
  const content = fs.readFileSync(latestFile.path, 'utf-8');
  return JSON.parse(content);
}

/**
 * Procesa los análisis y genera datos para el reporte
 */
function processAnalysisData(analyses: EMOAnalysis[]): ReportData {
  const exitosos = analyses.filter(a => !a.error);
  const totalTrabajadores = exitosos.length;

  let aptos = 0;
  let aptosConRestricciones = 0;
  let noAptos = 0;
  const restricciones = {
    lentes: 0,
    altura: 0,
    electricidad: 0
  };
  const hallazgosComunes: { [key: string]: number } = {};

  exitosos.forEach(analysis => {
    const aptitud = analysis.aptitud.toUpperCase();
    
    if (aptitud === 'APTO') {
      aptos++;
      if (analysis.restriccionesCount > 0) {
        aptosConRestricciones++;
      }
    } else if (aptitud.includes('NO APTO') || aptitud === 'NO APTO') {
      noAptos++;
    }

    if (analysis.restricciones.lentes === 'SI') restricciones.lentes++;
    if (analysis.restricciones.altura === 'SI') restricciones.altura++;
    if (analysis.restricciones.electricidad === 'SI') restricciones.electricidad++;

    analysis.hallazgos.forEach(hallazgo => {
      hallazgosComunes[hallazgo] = (hallazgosComunes[hallazgo] || 0) + 1;
    });
  });

  // Generar recomendaciones basadas en los hallazgos
  const recomendaciones: string[] = [];
  
  if (restricciones.lentes > 0) {
    recomendaciones.push('PROGRAMA DE SALUD VISUAL');
    recomendaciones.push('EQUIPOS DE PROTECCIÓN PERSONAL');
    recomendaciones.push('CAPACITACIÓN');
  }

  if (restricciones.altura > 0) {
    recomendaciones.push('EVALUACIÓN DE TRABAJOS EN ALTURA');
  }

  if (restricciones.electricidad > 0) {
    recomendaciones.push('PROGRAMA DE SEGURIDAD ELÉCTRICA');
  }

  return {
    empresa: 'Cliente', // Se puede personalizar
    fecha: new Date().toLocaleDateString('es-PE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    totalTrabajadores,
    aptos,
    aptosConRestricciones,
    noAptos,
    restricciones,
    hallazgosComunes,
    recomendaciones: [...new Set(recomendaciones)] // Eliminar duplicados
  };
}

/**
 * Genera el reporte en formato texto
 */
function generateReport(data: ReportData): string {
  const porcentajeAptos = data.totalTrabajadores > 0 
    ? Math.round((data.aptos / data.totalTrabajadores) * 100) 
    : 0;
  const porcentajeAptosConRestricciones = data.totalTrabajadores > 0
    ? Math.round((data.aptosConRestricciones / data.totalTrabajadores) * 100)
    : 0;
  const porcentajeNoAptos = data.totalTrabajadores > 0
    ? Math.round((data.noAptos / data.totalTrabajadores) * 100)
    : 0;

  // Identificar restricción más común
  const restriccionesArray = [
    { nombre: 'Uso permanente de lentes correctores', count: data.restricciones.lentes },
    { nombre: 'Restricción para trabajos en altura > 1.8m', count: data.restricciones.altura },
    { nombre: 'Restricción para fibra óptica/cables eléctricos', count: data.restricciones.electricidad }
  ].filter(r => r.count > 0)
   .sort((a, b) => b.count - a.count);

  const restriccionMasComun = restriccionesArray[0];
  const prevalenciaRestriccion = restriccionMasComun 
    ? Math.round((restriccionMasComun.count / data.totalTrabajadores) * 100)
    : 0;

  // Generar recomendaciones detalladas
  const recomendacionesDetalladas: { [key: string]: string[] } = {};

  if (data.restricciones.lentes > 0) {
    recomendacionesDetalladas['PROGRAMA DE SALUD VISUAL'] = [
      'Evaluaciones oftalmológicas anuales',
      'Convenio con óptica especializada',
      'Budget: ~S/. 300-500 por trabajador/año'
    ];
    recomendacionesDetalladas['EQUIPOS DE PROTECCIÓN PERSONAL'] = [
      'Lentes de seguridad graduados',
      'Certificados según norma ANSI Z87.1',
      'Reposición cada 12-18 meses'
    ];
    recomendacionesDetalladas['CAPACITACIÓN'] = [
      'Cuidado visual en el trabajo',
      'Uso correcto de EPP visual',
      'Señales de deterioro visual'
    ];
  }

  if (data.restricciones.altura > 0) {
    recomendacionesDetalladas['EVALUACIÓN DE TRABAJOS EN ALTURA'] = [
      'Revisión de procedimientos de trabajo en altura',
      'Capacitación en uso de sistemas de protección contra caídas',
      'Evaluación médica específica para trabajos en altura'
    ];
  }

  if (data.restricciones.electricidad > 0) {
    recomendacionesDetalladas['PROGRAMA DE SEGURIDAD ELÉCTRICA'] = [
      'Capacitación en seguridad eléctrica',
      'Uso de EPP específico para trabajos eléctricos',
      'Procedimientos de trabajo seguro con electricidad'
    ];
  }

  let reporte = `REPORTE DE VIGILANCIA MÉDICA OCUPACIONAL
Empresa: ${data.empresa}
Fecha: ${data.fecha}
Elaborado por: SERVYSALUD LF EIRL

═══════════════════════════════════════════

📊 RESUMEN EJECUTIVO

Total trabajadores evaluados: ${data.totalTrabajadores}
Aptitud laboral:
├─ APTOS: ${data.aptos} (${porcentajeAptos}%)
├─ APTOS CON RESTRICCIONES: ${data.aptosConRestricciones} (${porcentajeAptosConRestricciones}%)
└─ NO APTOS: ${data.noAptos} (${porcentajeNoAptos}%)

═══════════════════════════════════════════

`;

  // Hallazgos principales
  if (restriccionMasComun) {
    reporte += `⚠️  HALLAZGOS PRINCIPALES

Restricción común identificada:
"${restriccionMasComun.nombre}"
Prevalencia: ${restriccionMasComun.count}/${data.totalTrabajadores} trabajadores (${prevalenciaRestriccion}%)

`;
  }

  // Hallazgos adicionales
  const otrosHallazgos = Object.entries(data.hallazgosComunes)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5);

  if (otrosHallazgos.length > 0) {
    reporte += `Otros hallazgos detectados:\n`;
    otrosHallazgos.forEach(([hallazgo, count]) => {
      reporte += `• ${hallazgo}: ${count} caso(s)\n`;
    });
    reporte += '\n';
  }

  reporte += `═══════════════════════════════════════════

📋 RECOMENDACIONES INMEDIATAS

`;

  // Generar recomendaciones numeradas
  let numeroRecomendacion = 1;
  Object.entries(recomendacionesDetalladas).forEach(([titulo, acciones]) => {
    reporte += `${numeroRecomendacion}. ${titulo}\n`;
    acciones.forEach(accion => {
      reporte += `   • ${accion}\n`;
    });
    reporte += '\n';
    numeroRecomendacion++;
  });

  reporte += `═══════════════════════════════════════════

✅ CUMPLIMIENTO NORMATIVO

☑ Ley 29783 - SST
☑ D.S. 005-2012-TR
☑ RM 312-2011-MINSA
☑ Ley 29733 - Protección Datos

═══════════════════════════════════════════

Elaborado con tecnología IA
SERVYSALUD LF EIRL
RUC: [tu RUC]
`;

  return reporte;
}

/**
 * Función principal
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  📄 GENERADOR DE REPORTE DE VIGILANCIA MÉDICA OCUPACIONAL');
  console.log('='.repeat(60) + '\n');

  try {
    // Cargar análisis más recientes
    console.log('📂 Cargando resultados de análisis...');
    const analyses = loadLatestAnalysis();
    console.log(`✓ Se encontraron ${analyses.length} análisis\n`);

    // Procesar datos
    console.log('📊 Procesando datos...');
    const reportData = processAnalysisData(analyses);
    console.log('✓ Datos procesados\n');

    // Generar reporte
    console.log('📝 Generando reporte...');
    const reporte = generateReport(reportData);
    console.log('✓ Reporte generado\n');

    // Guardar reporte
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const reportFile = path.join(reportsDir, `reporte-vigilancia-${timestamp}.txt`);
    fs.writeFileSync(reportFile, reporte, 'utf-8');

    console.log('='.repeat(60));
    console.log('✅ REPORTE GENERADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`\n📁 Archivo guardado en: ${reportFile}\n`);

    // Mostrar preview del reporte
    console.log('📄 PREVIEW DEL REPORTE:');
    console.log('─'.repeat(60));
    console.log(reporte.substring(0, 1000));
    if (reporte.length > 1000) {
      console.log('\n... (reporte completo en el archivo)');
    }
    console.log('─'.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ Error al generar el reporte:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar
main();

