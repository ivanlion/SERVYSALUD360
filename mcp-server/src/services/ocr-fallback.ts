/**
 * Servicio de OCR como fallback cuando Gemini falla
 * 
 * Usa Tesseract.js para extraer texto de imágenes/PDFs escaneados
 * 
 * @module mcp-server/src/services/ocr-fallback
 */

/**
 * Resultado del OCR
 */
export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  error?: string;
}

/**
 * Extrae texto de una imagen usando OCR
 * 
 * Nota: Esta es una implementación básica. Para producción,
 * se recomienda usar tesseract.js o un servicio de OCR en la nube.
 * 
 * @param imageBase64 - Imagen en base64
 * @param language - Idioma para OCR (default: 'spa' para español)
 * @returns Texto extraído
 */
export async function extractTextWithOCR(
  imageBase64: string,
  language: string = 'spa'
): Promise<OCRResult> {
  try {
    // Validar entrada
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return {
        text: '',
        confidence: 0,
        language,
        error: 'Datos de imagen inválidos'
      };
    }

    // Por ahora, retornamos un resultado vacío
    // TODO: Implementar OCR real con tesseract.js
    // Ejemplo de implementación:
    // const { createWorker } = await import('tesseract.js');
    // const worker = await createWorker(language);
    // const { data: { text, confidence } } = await worker.recognize(imageBase64);
    // await worker.terminate();
    // return { text, confidence, language };

    console.warn('[OCR] OCR no está implementado. Se requiere tesseract.js para funcionar.');
    
    return {
      text: '',
      confidence: 0,
      language,
      error: 'OCR no implementado. Se requiere tesseract.js'
    };

  } catch (error: any) {
    return {
      text: '',
      confidence: 0,
      language,
      error: `Error en OCR: ${error?.message || String(error)}`
    };
  }
}

/**
 * Analiza un PDF escaneado usando OCR y extrae información estructurada
 * 
 * @param pdfBase64 - PDF escaneado en base64
 * @param prompt - Prompt para estructurar la información extraída
 * @returns Texto estructurado extraído
 */
export async function analyzeScannedPDFWithOCR(
  pdfBase64: string,
  prompt: string
): Promise<string> {
  try {
    // Extraer texto usando OCR
    const ocrResult = await extractTextWithOCR(pdfBase64);
    
    if (ocrResult.error || !ocrResult.text) {
      throw new Error(`OCR falló: ${ocrResult.error || 'No se pudo extraer texto'}`);
    }

    // Usar Gemini para estructurar el texto extraído por OCR
    // Esto es más eficiente que enviar la imagen completa
    const { analyzeDocument } = await import('./gemini');
    
    const structuredPrompt = `${prompt}

TEXTO EXTRAÍDO POR OCR (puede tener errores de reconocimiento):
${ocrResult.text}

Por favor, analiza este texto y estructura la información según el formato solicitado.`;

    return await analyzeDocument(structuredPrompt, undefined, false, 2);

  } catch (error: any) {
    throw new Error(`Error en análisis OCR: ${error?.message || String(error)}`);
  }
}

