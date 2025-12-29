/**
 * Servicio de validación de archivos PDF
 * 
 * Valida que un PDF sea válido y determine su tipo (texto, escaneado, mixto)
 * 
 * @module mcp-server/src/services/pdf-validator
 */

/**
 * Resultado de la validación de un PDF
 */
export interface PDFValidationResult {
  isValid: boolean;
  isScanned: boolean;
  hasText: boolean;
  pageCount?: number;
  sizeInMB: number;
  error?: string;
  type: 'text' | 'scanned' | 'mixed' | 'unknown';
}

/**
 * Valida un archivo PDF desde base64
 * 
 * @param pdfBase64 - Contenido del PDF en base64
 * @returns Resultado de la validación
 */
export async function validatePDF(pdfBase64: string): Promise<PDFValidationResult> {
  const result: PDFValidationResult = {
    isValid: false,
    isScanned: false,
    hasText: false,
    sizeInMB: 0,
    type: 'unknown'
  };

  try {
    // Validar que sea base64 válido
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      result.error = 'Datos PDF inválidos o vacíos';
      return result;
    }

    // Calcular tamaño
    const sizeInBytes = (pdfBase64.length * 3) / 4;
    result.sizeInMB = sizeInBytes / (1024 * 1024);

    // Validar tamaño máximo (20MB para Gemini)
    if (result.sizeInMB > 20) {
      result.error = `Archivo demasiado grande: ${result.sizeInMB.toFixed(2)}MB. Límite: 20MB`;
      return result;
    }

    // Validar firma PDF (debe empezar con %PDF)
    const decoded = Buffer.from(pdfBase64, 'base64');
    const header = decoded.slice(0, 4).toString('ascii');
    
    if (header !== '%PDF') {
      result.error = 'El archivo no es un PDF válido (firma incorrecta)';
      return result;
    }

    // Detectar si tiene texto extraíble (búsqueda simple de objetos de texto)
    // PDFs con texto tienen objetos como "BT" (Begin Text) y "ET" (End Text)
    const pdfContent = decoded.toString('latin1', 0, Math.min(decoded.length, 10000));
    const hasTextObjects = pdfContent.includes('/Type/Font') || 
                          pdfContent.includes('/Subtype/Type1') ||
                          pdfContent.includes('/Subtype/TrueType') ||
                          pdfContent.includes('BT') && pdfContent.includes('ET');

    result.hasText = hasTextObjects;
    
    // Detectar si es escaneado (tiene imágenes pero no texto)
    // PDFs escaneados típicamente tienen objetos de imagen pero pocos objetos de texto
    const hasImages = pdfContent.includes('/Type/XObject') && 
                     (pdfContent.includes('/Subtype/Image') || pdfContent.includes('/Filter/DCTDecode'));
    
    // Intentar contar páginas (búsqueda de /Count en el objeto Pages)
    const pageCountMatch = pdfContent.match(/\/Count\s+(\d+)/);
    if (pageCountMatch && pageCountMatch[1]) {
      result.pageCount = parseInt(pageCountMatch[1], 10);
    }

    // Determinar tipo
    if (hasTextObjects && hasImages) {
      result.type = 'mixed';
    } else if (hasTextObjects && !hasImages) {
      result.type = 'text';
    } else if (hasImages && !hasTextObjects) {
      result.type = 'scanned';
      result.isScanned = true;
    } else {
      result.type = 'unknown';
    }

    result.isValid = true;
    return result;

  } catch (error: any) {
    result.error = `Error al validar PDF: ${error?.message || String(error)}`;
    return result;
  }
}

/**
 * Verifica si un PDF necesita pre-procesamiento
 */
export function needsPreprocessing(validation: PDFValidationResult): boolean {
  return validation.isScanned || 
         (validation.type === 'mixed' && !validation.hasText) ||
         (validation.sizeInMB > 5 && validation.type === 'scanned');
}

