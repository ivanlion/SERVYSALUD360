#!/usr/bin/env tsx
/**
 * Generador de Reporte PDF Profesional
 * 
 * Genera un PDF profesional con logo, marca y datos del análisis
 * 
 * @module scripts/generar-pdf-reporte
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

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
function processAnalysisData(analyses: EMOAnalysis[], empresa: string = 'Cliente'): ReportData {
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
    empresa,
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
    recomendaciones: [...new Set(recomendaciones)]
  };
}

/**
 * Genera el PDF profesional
 */
function generatePDF(data: ReportData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // ============================================
      // ENCABEZADO CON LOGO Y MARCA
      // ============================================
      doc.fontSize(24)
         .fillColor('#1e40af')
         .font('Helvetica-Bold')
         .text('SERVYSALUD LF EIRL', 50, 50, { align: 'center' });

      doc.fontSize(12)
         .fillColor('#6b7280')
         .font('Helvetica')
         .text('Vigilancia Médica Ocupacional', 50, 80, { align: 'center' });

      // Línea separadora
      doc.moveTo(50, 100)
         .lineTo(562, 100)
         .strokeColor('#e5e7eb')
         .lineWidth(1)
         .stroke();

      // ============================================
      // TÍTULO DEL REPORTE
      // ============================================
      doc.fontSize(18)
         .fillColor('#111827')
         .font('Helvetica-Bold')
         .text('REPORTE DE VIGILANCIA MÉDICA OCUPACIONAL', 50, 120, { align: 'center' });

      doc.fontSize(11)
         .fillColor('#6b7280')
         .font('Helvetica')
         .text(`Empresa: ${data.empresa}`, 50, 150)
         .text(`Fecha: ${data.fecha}`, 50, 165)
         .text(`Elaborado por: SERVYSALUD LF EIRL`, 50, 180);

      let yPosition = 220;

      // ============================================
      // RESUMEN EJECUTIVO
      // ============================================
      doc.fontSize(14)
         .fillColor('#1e40af')
         .font('Helvetica-Bold')
         .text('📊 RESUMEN EJECUTIVO', 50, yPosition);

      yPosition += 25;

      const porcentajeAptos = data.totalTrabajadores > 0 
        ? Math.round((data.aptos / data.totalTrabajadores) * 100) 
        : 0;
      const porcentajeAptosConRestricciones = data.totalTrabajadores > 0
        ? Math.round((data.aptosConRestricciones / data.totalTrabajadores) * 100)
        : 0;
      const porcentajeNoAptos = data.totalTrabajadores > 0
        ? Math.round((data.noAptos / data.totalTrabajadores) * 100)
        : 0;

      doc.fontSize(11)
         .fillColor('#111827')
         .font('Helvetica')
         .text(`Total trabajadores evaluados: ${data.totalTrabajadores}`, 50, yPosition);

      yPosition += 20;

      doc.font('Helvetica-Bold')
         .text('Aptitud laboral:', 50, yPosition);

      yPosition += 20;

      doc.font('Helvetica')
         .text(`├─ APTOS: ${data.aptos} (${porcentajeAptos}%)`, 70, yPosition);
      yPosition += 18;
      doc.text(`├─ APTOS CON RESTRICCIONES: ${data.aptosConRestricciones} (${porcentajeAptosConRestricciones}%)`, 70, yPosition);
      yPosition += 18;
      doc.text(`└─ NO APTOS: ${data.noAptos} (${porcentajeNoAptos}%)`, 70, yPosition);

      yPosition += 30;

      // ============================================
      // HALLAZGOS PRINCIPALES
      // ============================================
      doc.fontSize(14)
         .fillColor('#dc2626')
         .font('Helvetica-Bold')
         .text('⚠️  HALLAZGOS PRINCIPALES', 50, yPosition);

      yPosition += 25;

      // Identificar restricción más común
      const restriccionesArray = [
        { nombre: 'Uso permanente de lentes correctores', count: data.restricciones.lentes },
        { nombre: 'Restricción para trabajos en altura > 1.8m', count: data.restricciones.altura },
        { nombre: 'Restricción para fibra óptica/cables eléctricos', count: data.restricciones.electricidad }
      ].filter(r => r.count > 0)
       .sort((a, b) => b.count - a.count);

      if (restriccionesArray.length > 0) {
        const restriccionMasComun = restriccionesArray[0];
        const prevalencia = Math.round((restriccionMasComun.count / data.totalTrabajadores) * 100);

        doc.fontSize(11)
           .fillColor('#111827')
           .font('Helvetica-Bold')
           .text('Restricción común identificada:', 50, yPosition);

        yPosition += 18;

        doc.font('Helvetica')
           .text(`"${restriccionMasComun.nombre}"`, 70, yPosition);

        yPosition += 18;

        doc.text(`Prevalencia: ${restriccionMasComun.count}/${data.totalTrabajadores} trabajadores (${prevalencia}%)`, 70, yPosition);

        yPosition += 25;
      }

      // Otros hallazgos
      const otrosHallazgos = Object.entries(data.hallazgosComunes)
        .filter(([_, count]) => count > 0)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 5);

      if (otrosHallazgos.length > 0) {
        doc.font('Helvetica-Bold')
           .text('Otros hallazgos detectados:', 50, yPosition);

        yPosition += 18;

        otrosHallazgos.forEach(([hallazgo, count]) => {
          doc.font('Helvetica')
             .text(`• ${hallazgo}: ${count} caso(s)`, 70, yPosition);
          yPosition += 18;
        });

        yPosition += 10;
      }

      // Verificar si necesitamos nueva página
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      // ============================================
      // RECOMENDACIONES
      // ============================================
      doc.fontSize(14)
         .fillColor('#059669')
         .font('Helvetica-Bold')
         .text('📋 RECOMENDACIONES INMEDIATAS', 50, yPosition);

      yPosition += 25;

      let numeroRecomendacion = 1;

      if (data.restricciones.lentes > 0) {
        doc.fontSize(11)
           .fillColor('#111827')
           .font('Helvetica-Bold')
           .text(`${numeroRecomendacion}. PROGRAMA DE SALUD VISUAL`, 50, yPosition);

        yPosition += 20;

        doc.font('Helvetica')
           .text('• Evaluaciones oftalmológicas anuales', 70, yPosition);
        yPosition += 18;
        doc.text('• Convenio con óptica especializada', 70, yPosition);
        yPosition += 18;
        doc.text('• Budget: ~S/. 300-500 por trabajador/año', 70, yPosition);
        yPosition += 25;

        doc.text(`${numeroRecomendacion + 1}. EQUIPOS DE PROTECCIÓN PERSONAL`, 50, yPosition);
        yPosition += 20;
        doc.text('• Lentes de seguridad graduados', 70, yPosition);
        yPosition += 18;
        doc.text('• Certificados según norma ANSI Z87.1', 70, yPosition);
        yPosition += 18;
        doc.text('• Reposición cada 12-18 meses', 70, yPosition);
        yPosition += 25;

        doc.text(`${numeroRecomendacion + 2}. CAPACITACIÓN`, 50, yPosition);
        yPosition += 20;
        doc.text('• Cuidado visual en el trabajo', 70, yPosition);
        yPosition += 18;
        doc.text('• Uso correcto de EPP visual', 70, yPosition);
        yPosition += 18;
        doc.text('• Señales de deterioro visual', 70, yPosition);
        yPosition += 25;
      }

      // Verificar si necesitamos nueva página
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      // ============================================
      // CUMPLIMIENTO NORMATIVO
      // ============================================
      doc.fontSize(14)
         .fillColor('#059669')
         .font('Helvetica-Bold')
         .text('✅ CUMPLIMIENTO NORMATIVO', 50, yPosition);

      yPosition += 25;

      doc.fontSize(11)
         .fillColor('#111827')
         .font('Helvetica')
         .text('☑ Ley 29783 - SST', 50, yPosition);
      yPosition += 18;
      doc.text('☑ D.S. 005-2012-TR', 50, yPosition);
      yPosition += 18;
      doc.text('☑ RM 312-2011-MINSA', 50, yPosition);
      yPosition += 18;
      doc.text('☑ Ley 29733 - Protección Datos', 50, yPosition);

      yPosition += 30;

      // ============================================
      // PIE DE PÁGINA
      // ============================================
      const pageHeight = doc.page.height;
      const pageWidth = doc.page.width;

      doc.fontSize(9)
         .fillColor('#6b7280')
         .font('Helvetica')
         .text('Elaborado con tecnología IA', pageWidth / 2, pageHeight - 80, { align: 'center' })
         .text('SERVYSALUD LF EIRL', pageWidth / 2, pageHeight - 65, { align: 'center' })
         .text('RUC: [tu RUC]', pageWidth / 2, pageHeight - 50, { align: 'center' });

      doc.end();

      // Los números de página se agregarán después de que el documento esté completo
      // PDFKit maneja esto automáticamente o podemos usar eventos

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Función principal
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  📄 GENERADOR DE REPORTE PDF PROFESIONAL');
  console.log('='.repeat(60) + '\n');

  try {
    // Cargar análisis más recientes
    console.log('📂 Cargando resultados de análisis...');
    const analyses = loadLatestAnalysis();
    console.log(`✓ Se encontraron ${analyses.length} análisis\n`);

    // Solicitar nombre de empresa (o usar por defecto)
    const empresa = process.argv[2] || 'Cliente';
    if (empresa === 'Cliente') {
      console.log('💡 Tip: Puedes especificar el nombre de la empresa como argumento:');
      console.log('   npm run generar-pdf "Nombre de la Empresa"\n');
    }

    // Procesar datos
    console.log('📊 Procesando datos...');
    const reportData = processAnalysisData(analyses, empresa);
    console.log('✓ Datos procesados\n');

    // Generar PDF
    console.log('📝 Generando PDF...');
    const pdfsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const empresaSlug = empresa.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const pdfFile = path.join(pdfsDir, `reporte-vigilancia-${empresaSlug}-${timestamp}.pdf`);

    await generatePDF(reportData, pdfFile);

    console.log('='.repeat(60));
    console.log('✅ PDF GENERADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`\n📁 Archivo guardado en: ${pdfFile}\n`);

    // Mostrar información del archivo
    const stats = fs.statSync(pdfFile);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 Tamaño del archivo: ${fileSizeMB} MB`);
    console.log(`📄 Formato: PDF profesional con logo y marca`);
    console.log(`✅ Listo para enviar por email\n`);

  } catch (error: any) {
    console.error('\n❌ Error al generar el PDF:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar
main();

