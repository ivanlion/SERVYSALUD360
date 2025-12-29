/**
 * Cliente compartido de Gemini AI
 * 
 * Usado tanto por MCP como por scripts directos
 * Centraliza la lógica de análisis para evitar duplicación
 * 
 * @module lib/services/gemini-client
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicialización lazy del cliente de Gemini para permitir carga de variables de entorno
let genAI: GoogleGenerativeAI | null = null;
let geminiModelInstance: any = null;

function getGeminiModel() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GEMINI_API_KEY no está configurada. Por favor, configúrala en .env.local');
  }
  
  if (!genAI || !geminiModelInstance) {
    genAI = new GoogleGenerativeAI(apiKey);
    geminiModelInstance = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash"
    });
  }
  
  return geminiModelInstance;
}

// Mantener compatibilidad con código existente
export const geminiModel = new Proxy({} as any, {
  get(_target, prop) {
    return getGeminiModel()[prop];
  }
});

/**
 * Analiza un documento usando Gemini AI con retry logic y manejo robusto de errores
 * 
 * @param prompt - Prompt para el análisis
 * @param fileData - Datos del archivo en base64 (opcional)
 * @param useThinking - Si usar el modo "thinking" de Gemini (opcional, default: false)
 * @param maxRetries - Número máximo de reintentos (default: 3)
 * @returns Texto de la respuesta de Gemini
 * @throws Error con detalles específicos del tipo de error
 */
export async function analyzeDocument(
  prompt: string,
  fileData?: string,
  useThinking: boolean = false,
  maxRetries: number = 3
): Promise<string> {
  const errors: Array<{ attempt: number; error: any }> = [];
  
  // Validar tamaño del archivo (límite de Gemini: ~20MB en base64)
  if (fileData) {
    const sizeInBytes = (fileData.length * 3) / 4; // Aproximación del tamaño en bytes
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB > 20) {
      throw new Error(`Archivo demasiado grande: ${sizeInMB.toFixed(2)}MB. Límite: 20MB`);
    }
    
    // Log para archivos grandes
    if (sizeInMB > 5) {
      console.warn(`[Gemini] Archivo grande detectado: ${sizeInMB.toFixed(2)}MB. El análisis puede tardar más.`);
    }
  }
  
  // Estructurar el contenido según la API de Gemini
  const parts: any[] = [];
  
  // Agregar el archivo primero si está presente
  if (fileData) {
    parts.push({
      inlineData: {
        mimeType: detectMimeType(fileData),
        data: fileData
      }
    });
  }
  
  // Agregar el prompt como texto
  parts.push({
    text: prompt
  });
  
  // Configuración de generación
  const generationConfig: any = {
    temperature: 0.2,
    maxOutputTokens: 8192,
  };
  
  // Agregar thinkingBudget solo si useThinking es true y está disponible
  if (useThinking) {
    generationConfig.thinkingBudget = 1024;
  }
  
  // Retry logic con backoff exponencial mejorado
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      
      const model = getGeminiModel();
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: parts
        }],
        generationConfig
      });
      
      const duration = Date.now() - startTime;
      console.log(`[Gemini] Análisis completado en ${duration}ms (intento ${attempt}/${maxRetries})`);
      
      return result.response.text();
      
    } catch (error: any) {
      const errorDetails = {
        attempt,
        error: {
          name: error?.name || 'UnknownError',
          message: error?.message || String(error),
          code: error?.code || error?.status || 'UNKNOWN',
          status: error?.status || error?.statusCode || 'UNKNOWN',
          details: error?.details || error?.response?.data || null
        }
      };
      
      errors.push(errorDetails);
      
      // Log del error
      console.error(`[Gemini] Error en intento ${attempt}/${maxRetries}:`, {
        code: errorDetails.error.code,
        message: errorDetails.error.message,
        status: errorDetails.error.status
      });
      
      // Si es el último intento, lanzar error con todos los detalles
      if (attempt === maxRetries) {
        const errorMessage = `Error después de ${maxRetries} intentos. Último error: ${errorDetails.error.message} (Código: ${errorDetails.error.code})`;
        const enhancedError = new Error(errorMessage) as any;
        enhancedError.attempts = errors;
        enhancedError.lastError = errorDetails.error;
        enhancedError.isRetryable = isRetryableError(error);
        throw enhancedError;
      }
      
      // Backoff exponencial con jitter para evitar thundering herd
      const baseBackoff = 1000 * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000; // Jitter aleatorio de 0-1s
      const backoffMs = Math.min(baseBackoff + jitter, 10000); // Máximo 10 segundos
      
      console.log(`[Gemini] Reintentando en ${Math.round(backoffMs)}ms... (backoff exponencial con jitter)`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  // Esto no debería ejecutarse nunca, pero TypeScript lo requiere
  throw new Error('Error inesperado en analyzeDocument');
}

/**
 * Analiza un PDF directamente con Gemini (alias para compatibilidad)
 * 
 * @param pdfBase64 - PDF en base64
 * @param prompt - Prompt de análisis
 * @param maxRetries - Intentos máximos (default: 3)
 * @returns Texto de respuesta de Gemini
 */
export async function analyzePDFDirect(
  pdfBase64: string,
  prompt: string,
  maxRetries: number = 3
): Promise<string> {
  return analyzeDocument(prompt, pdfBase64, false, maxRetries);
}

/**
 * Determina si un error es recuperable (debe reintentarse)
 */
function isRetryableError(error: any): boolean {
  const retryableCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ];
  
  const code = error?.code || error?.status || error?.statusCode;
  return retryableCodes.includes(code) || code?.toString().startsWith('5');
}

/**
 * Detecta el tipo MIME de los datos basándose en la firma del archivo
 * 
 * @param data - Datos del archivo en base64
 * @returns Tipo MIME detectado
 */
function detectMimeType(data: string): string {
  if (data.startsWith('JVBERi')) return 'application/pdf';
  if (data.startsWith('/9j/')) return 'image/jpeg';
  if (data.startsWith('iVBORw')) return 'image/png';
  return 'application/pdf';
}

