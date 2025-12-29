#!/usr/bin/env tsx
/**
 * Enviar PDF por Email
 * 
 * Envía el reporte PDF generado por email usando nodemailer o similar
 * 
 * @module scripts/enviar-pdf-email
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Encuentra el PDF más reciente
 */
function findLatestPDF(): string | null {
  const reportsDir = path.join(__dirname, '../reports');
  
  if (!fs.existsSync(reportsDir)) {
    return null;
  }

  const files = fs.readdirSync(reportsDir)
    .filter(f => f.startsWith('reporte-vigilancia-') && f.endsWith('.pdf'))
    .map(f => ({
      name: f,
      path: path.join(reportsDir, f),
      time: fs.statSync(path.join(reportsDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? files[0].path : null;
}

/**
 * Genera instrucciones para enviar el PDF por email
 */
function generateEmailInstructions(pdfPath: string, cliente: string): string {
  const pdfName = path.basename(pdfPath);
  const stats = fs.statSync(pdfPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  return `📧 INSTRUCCIONES PARA ENVIAR PDF POR EMAIL

📄 Archivo PDF: ${pdfName}
📊 Tamaño: ${fileSizeMB} MB
👤 Cliente: ${cliente}

OPCIÓN 1: Gmail / Outlook (Web)
────────────────────────────────
1. Abre tu cliente de email (Gmail, Outlook, etc.)
2. Crea un nuevo mensaje
3. Adjunta el archivo: ${pdfPath}
4. Usa el email generado con: npm run generar-email "${cliente}"
5. Copia el contenido del email y pégalo en el cuerpo
6. Envía

OPCIÓN 2: Usando Mail (macOS)
──────────────────────────────
1. Abre Mail.app
2. Crea un nuevo mensaje
3. Arrastra el PDF a la ventana del email
4. Usa el email generado como plantilla

OPCIÓN 3: Usando línea de comandos (mail)
──────────────────────────────────────────
mail -s "🔍 Hallazgos importantes - EMOs" ${cliente}@ejemplo.com < email.txt
uuencode ${pdfPath} ${pdfName} | mail -s "Reporte Vigilancia Médica" ${cliente}@ejemplo.com

NOTA: Para envío automático, se requiere configurar:
- Nodemailer con SMTP
- O servicio de email como SendGrid, Mailgun, etc.

¿Deseas que implemente envío automático por email?
`;
}

/**
 * Función principal
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  📧 ENVIAR PDF POR EMAIL');
  console.log('='.repeat(60) + '\n');

  try {
    const cliente = process.argv[2] || '[Cliente]';
    const pdfPath = findLatestPDF();

    if (!pdfPath) {
      console.error('❌ No se encontró ningún PDF generado.');
      console.error('   Ejecuta primero: npm run generar-pdf');
      process.exit(1);
    }

    console.log(`✓ PDF encontrado: ${path.basename(pdfPath)}\n`);

    const instrucciones = generateEmailInstructions(pdfPath, cliente);
    console.log(instrucciones);

    // Guardar instrucciones
    const instruccionesFile = path.join(__dirname, '../emails', 'instrucciones-envio.txt');
    const emailsDir = path.join(__dirname, '../emails');
    if (!fs.existsSync(emailsDir)) {
      fs.mkdirSync(emailsDir, { recursive: true });
    }
    fs.writeFileSync(instruccionesFile, instrucciones, 'utf-8');
    console.log(`\n📁 Instrucciones guardadas en: ${instruccionesFile}\n`);

  } catch (error: any) {
    console.error('\n❌ Error:');
    console.error(error.message);
    process.exit(1);
  }
}

main();

