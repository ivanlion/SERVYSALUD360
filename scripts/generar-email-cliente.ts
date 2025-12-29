#!/usr/bin/env tsx
/**
 * Generador de Email Profesional para Clientes
 * 
 * Genera un email profesional basado en los hallazgos de análisis de EMOs
 * 
 * @module scripts/generar-email-cliente
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

interface EmailData {
  cliente: string;
  mes: string;
  anio: number;
  totalEMOs: number;
  hallazgoPrincipal: {
    tipo: string;
    descripcion: string;
    prevalencia: number;
    total: number;
  };
  recomendaciones: {
    titulo: string;
    items: string[];
  }[];
  beneficios: string[];
  inversion: {
    porTrabajador: string;
    total: string;
    trabajadores: number;
  };
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
 * Procesa los análisis y genera datos para el email
 */
function processEmailData(analyses: EMOAnalysis[], cliente: string = '[Cliente]'): EmailData {
  const exitosos = analyses.filter(a => !a.error);
  const totalEMOs = exitosos.length;

  // Identificar restricción más común
  let lentesCount = 0;
  let alturaCount = 0;
  let electricidadCount = 0;

  exitosos.forEach(analysis => {
    if (analysis.restricciones.lentes === 'SI') lentesCount++;
    if (analysis.restricciones.altura === 'SI') alturaCount++;
    if (analysis.restricciones.electricidad === 'SI') electricidadCount++;
  });

  const restricciones = [
    { 
      tipo: 'visual', 
      descripcion: 'Uso permanente de lentes correctores',
      count: lentesCount 
    },
    { 
      tipo: 'altura', 
      descripcion: 'Restricción para trabajos en altura > 1.8m',
      count: alturaCount 
    },
    { 
      tipo: 'electricidad', 
      descripcion: 'Restricción para fibra óptica/cables eléctricos',
      count: electricidadCount 
    }
  ].filter(r => r.count > 0)
   .sort((a, b) => b.count - a.count);

  const hallazgoPrincipal = restricciones[0] || {
    tipo: 'general',
    descripcion: 'No se identificaron restricciones específicas',
    count: 0
  };

  const prevalencia = totalEMOs > 0 
    ? Math.round((hallazgoPrincipal.count / totalEMOs) * 100) 
    : 0;

  // Generar recomendaciones basadas en el hallazgo principal
  const recomendaciones: { titulo: string; items: string[] }[] = [];

  if (hallazgoPrincipal.tipo === 'visual') {
    recomendaciones.push({
      titulo: 'Programa de salud visual',
      items: [
        'Evaluaciones oftalmológicas anuales',
        'Lentes de seguridad graduados certificados',
        'Capacitación en cuidado visual ocupacional'
      ]
    });
  } else if (hallazgoPrincipal.tipo === 'altura') {
    recomendaciones.push({
      titulo: 'Programa de seguridad en altura',
      items: [
        'Evaluaciones médicas específicas para trabajos en altura',
        'Capacitación en uso de sistemas de protección contra caídas',
        'Revisión de procedimientos de trabajo seguro'
      ]
    });
  } else if (hallazgoPrincipal.tipo === 'electricidad') {
    recomendaciones.push({
      titulo: 'Programa de seguridad eléctrica',
      items: [
        'Capacitación en seguridad eléctrica',
        'Uso de EPP específico para trabajos eléctricos',
        'Procedimientos de trabajo seguro con electricidad'
      ]
    });
  }

  // Beneficios esperados
  const beneficios: string[] = [];
  if (hallazgoPrincipal.tipo === 'visual') {
    beneficios.push('Reducción de accidentes por deficiencia visual');
    beneficios.push('Mejora en productividad (mejor visión = mejor trabajo)');
    beneficios.push('Cumplimiento normativo Ley 29783');
  } else if (hallazgoPrincipal.tipo === 'altura') {
    beneficios.push('Reducción de riesgos de caídas');
    beneficios.push('Cumplimiento de normativa de seguridad en altura');
    beneficios.push('Mejora en la seguridad del personal');
  } else if (hallazgoPrincipal.tipo === 'electricidad') {
    beneficios.push('Reducción de riesgos eléctricos');
    beneficios.push('Cumplimiento de normativa de seguridad eléctrica');
    beneficios.push('Protección del personal en trabajos eléctricos');
  }

  // Calcular inversión estimada
  let inversionPorTrabajador = 'S/. 300-500';
  if (hallazgoPrincipal.tipo === 'altura') {
    inversionPorTrabajador = 'S/. 200-400';
  } else if (hallazgoPrincipal.tipo === 'electricidad') {
    inversionPorTrabajador = 'S/. 150-300';
  }

  const inversionTotal = totalEMOs > 0
    ? `S/. ${(totalEMOs * 300).toLocaleString()}-${(totalEMOs * 500).toLocaleString()}`
    : 'S/. 0';

  const fecha = new Date();
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  return {
    cliente,
    mes: meses[fecha.getMonth()],
    anio: fecha.getFullYear(),
    totalEMOs,
    hallazgoPrincipal: {
      tipo: hallazgoPrincipal.tipo,
      descripcion: hallazgoPrincipal.descripcion,
      prevalencia,
      total: hallazgoPrincipal.count
    },
    recomendaciones,
    beneficios,
    inversion: {
      porTrabajador: inversionPorTrabajador,
      total: inversionTotal,
      trabajadores: totalEMOs
    }
  };
}

/**
 * Genera el email en formato texto
 */
function generateEmail(data: EmailData): string {
  // Si solo hay una recomendación, mostrar los items directamente numerados
  if (data.recomendaciones.length === 1) {
    const rec = data.recomendaciones[0];
    const recomendacionesTexto = rec.items
      .map((item, index) => `${index + 1}. ${item}`)
      .join('\n');
    
    const email = `De: Ivan Leon <ivan@servysalud.pe>
Para: ${data.cliente}
Asunto: 🔍 Hallazgos importantes - EMOs ${data.mes} ${data.anio}

Estimado cliente,

Hemos completado el análisis de los ${data.totalEMOs} EMOs de ${data.mes}
utilizando nuestra plataforma con inteligencia artificial.

🎯 HALLAZGO PRINCIPAL:
El ${data.hallazgoPrincipal.prevalencia}% de sus trabajadores requiere ${data.hallazgoPrincipal.descripcion.toLowerCase()}.

💡 RECOMENDACIÓN INMEDIATA:
Le sugerimos implementar un ${rec.titulo} que
incluya:

${recomendacionesTexto}

📊 BENEFICIOS ESPERADOS:
${data.beneficios.map(b => `- ${b}`).join('\n')}

💰 INVERSIÓN ESTIMADA:
${data.inversion.porTrabajador} por trabajador (incluye evaluación + implementación)
Total: ${data.inversion.total} para ${data.inversion.trabajadores} trabajadores

¿Le gustaría agendar una reunión para revisar el
${rec.titulo}?

Atentamente,
Dr. Ivan Leon
SERVYSALUD LF EIRL
📱 [tu teléfono]
📧 ivan@servysalud.pe`;
    
    return email;
  }
  
  // Si hay múltiples recomendaciones
  const recomendacionesTexto = data.recomendaciones
    .map((rec, index) => {
      const items = rec.items.map((item, itemIndex) => `   ${itemIndex + 1}. ${item}`).join('\n');
      return `${index + 1}. ${rec.titulo.charAt(0).toUpperCase() + rec.titulo.slice(1)}:\n${items}`;
    })
    .join('\n\n');

  const beneficiosTexto = data.beneficios
    .map(beneficio => `- ${beneficio}`)
    .join('\n');

  const email = `De: Ivan Leon <ivan@servysalud.pe>
Para: ${data.cliente}
Asunto: 🔍 Hallazgos importantes - EMOs ${data.mes} ${data.anio}

Estimado cliente,

Hemos completado el análisis de los ${data.totalEMOs} EMOs de ${data.mes}
utilizando nuestra plataforma con inteligencia artificial.

🎯 HALLAZGO PRINCIPAL:
El ${data.hallazgoPrincipal.prevalencia}% de sus trabajadores requiere ${data.hallazgoPrincipal.descripcion.toLowerCase()}.

💡 RECOMENDACIÓN INMEDIATA:
Le sugerimos implementar un ${data.recomendaciones[0]?.titulo || 'programa preventivo'} que
incluya:

${recomendacionesTexto}

📊 BENEFICIOS ESPERADOS:
${beneficiosTexto}

💰 INVERSIÓN ESTIMADA:
${data.inversion.porTrabajador} por trabajador (incluye evaluación + implementación)
Total: ${data.inversion.total} para ${data.inversion.trabajadores} trabajadores

¿Le gustaría agendar una reunión para revisar el
${data.recomendaciones[0]?.titulo || 'programa preventivo'}?

Atentamente,
Dr. Ivan Leon
SERVYSALUD LF EIRL
📱 [tu teléfono]
📧 ivan@servysalud.pe`;

  return email;
}

/**
 * Función principal
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  📧 GENERADOR DE EMAIL PROFESIONAL PARA CLIENTES');
  console.log('='.repeat(60) + '\n');

  try {
    // Cargar análisis más recientes
    console.log('📂 Cargando resultados de análisis...');
    const analyses = loadLatestAnalysis();
    console.log(`✓ Se encontraron ${analyses.length} análisis\n`);

    // Solicitar nombre del cliente (o usar por defecto)
    const cliente = process.argv[2] || '[Cliente]';
    if (cliente === '[Cliente]') {
      console.log('💡 Tip: Puedes especificar el nombre del cliente como argumento:');
      console.log('   npm run generar-email "Nombre del Cliente"\n');
    }

    // Procesar datos
    console.log('📊 Procesando datos...');
    const emailData = processEmailData(analyses, cliente);
    console.log('✓ Datos procesados\n');

    // Generar email
    console.log('📝 Generando email...');
    const email = generateEmail(emailData);
    console.log('✓ Email generado\n');

    // Guardar email
    const emailsDir = path.join(__dirname, '../emails');
    if (!fs.existsSync(emailsDir)) {
      fs.mkdirSync(emailsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const clienteSlug = cliente.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const emailFile = path.join(emailsDir, `email-${clienteSlug}-${timestamp}.txt`);
    fs.writeFileSync(emailFile, email, 'utf-8');

    console.log('='.repeat(60));
    console.log('✅ EMAIL GENERADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`\n📁 Archivo guardado en: ${emailFile}\n`);

    // Mostrar email completo
    console.log('📧 EMAIL GENERADO:');
    console.log('─'.repeat(60));
    console.log(email);
    console.log('─'.repeat(60) + '\n');

    // Mostrar instrucciones para copiar
    console.log('💡 INSTRUCCIONES:');
    console.log('   1. Copia el email desde el archivo generado');
    console.log('   2. Personaliza el nombre del cliente si es necesario');
    console.log('   3. Agrega tu número de teléfono en [tu teléfono]');
    console.log('   4. Revisa y envía desde tu cliente de email\n');

  } catch (error: any) {
    console.error('\n❌ Error al generar el email:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar
main();

