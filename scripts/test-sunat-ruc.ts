/**
 * Script de prueba para consultar RUC en SUNAT
 * 
 * Este script permite probar la consulta de RUC y ver el HTML exacto
 * que devuelve SUNAT para ajustar los patrones de regex
 * 
 * Ejecutar: npx tsx scripts/test-sunat-ruc.ts <RUC>
 */

import * as fs from 'fs';
import * as path from 'path';

const RUC = process.argv[2] || '20100070970'; // RUC de prueba por defecto

async function testSunatRuc() {
  console.log(`🔍 Consultando RUC: ${RUC}`);
  
  const sunatUrl = 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias';
  
  const formData = new URLSearchParams();
  formData.append('accion', 'getPorRuc');
  formData.append('nroRuc', RUC);
  formData.append('numRnd', Math.random().toString());

  try {
    const response = await fetch(sunatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp',
        'Origin': 'https://e-consultaruc.sunat.gob.pe',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`SUNAT respondió con status: ${response.status}`);
    }

    const html = await response.text();
    
    console.log(`\n✅ Respuesta recibida (${html.length} caracteres)\n`);
    
    // Guardar HTML completo en archivo para análisis
    const outputDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `sunat-ruc-${RUC}.html`);
    fs.writeFileSync(outputFile, html, 'utf-8');
    console.log(`📁 HTML guardado en: ${outputFile}\n`);
    
    // Mostrar una muestra del HTML
    console.log('📄 Muestra del HTML (primeros 3000 caracteres):');
    console.log('='.repeat(80));
    console.log(html.substring(0, 3000));
    console.log('='.repeat(80));
    
    // Buscar posibles campos
    console.log('\n🔍 Buscando campos comunes:\n');
    
    const campos = [
      'Razón Social',
      'Razon Social',
      'Dirección',
      'Direccion',
      'Estado',
      'Condición',
      'Condicion',
      'Nombre Comercial',
      'Departamento',
      'Provincia',
      'Distrito',
    ];
    
    campos.forEach(campo => {
      const regex = new RegExp(`${campo.replace(/\s/g, '\\s+')}[:\s]*</td>\\s*<td[^>]*>([^<]+)`, 'i');
      const match = html.match(regex);
      if (match) {
        console.log(`  ✅ ${campo}: ${match[1].trim()}`);
      } else {
        // Intentar otro patrón
        const regex2 = new RegExp(`${campo.replace(/\s/g, '\\s+')}[:\s]+([^<\\n]+)`, 'i');
        const match2 = html.match(regex2);
        if (match2) {
          console.log(`  ✅ ${campo} (patrón 2): ${match2[1].trim()}`);
        } else {
          console.log(`  ❌ ${campo}: No encontrado`);
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSunatRuc();


