/**
 * Servicio de Google Gemini AI para el servidor MCP
 * 
 * Configuración para usar Gemini 2.5 Flash Preview
 * 
 * @module mcp-server/src/services/gemini
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// Modelos disponibles en la API (del más reciente al más antiguo):
// - gemini-2.0-flash-thinking-exp (experimental, con modo thinking avanzado - mejor para análisis complejos)
// - gemini-2.0-flash-exp (experimental, más reciente)
// - gemini-2.5-flash (estable, lanzado junio 2025 - ACTUAL)
// - gemini-1.5-flash (estable anterior)
// - gemini-1.5-pro (estable anterior, más potente pero más lento)

// Usar Gemini 2.0 Flash
export const gemini25Flash = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash" // Gemini 2.0 Flash
});

/**
 * Analiza un documento usando Gemini AI
 * 
 * @param prompt - Prompt para el análisis
 * @param fileData - Datos del archivo en base64 (opcional)
 * @param useThinking - Si usar el modo "thinking" de Gemini (opcional, default: false)
 * @returns Texto de la respuesta de Gemini
 */
export async function analyzeDocument(
  prompt: string,
  fileData?: string,
  useThinking: boolean = false
) {
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
  
  // Configuración de generación (thinkingBudget puede no estar disponible en todas las versiones)
  const generationConfig: any = {
    temperature: 0.2,
    maxOutputTokens: 8192,
  };
  
  // Agregar thinkingBudget solo si useThinking es true y está disponible
  if (useThinking) {
    generationConfig.thinkingBudget = 1024;
  }
  
  const result = await gemini25Flash.generateContent({
    contents: [{
      role: 'user',
      parts: parts
    }],
    generationConfig
  });
  
  return result.response.text();
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

