/**
 * Servicio de Google Gemini AI para el servidor MCP
 * 
 * Re-exporta el cliente compartido de Gemini para mantener compatibilidad
 * 
 * @module mcp-server/src/services/gemini
 * @deprecated Usar lib/services/gemini-client.ts directamente
 */

// Re-exportar desde el cliente compartido
export { analyzeDocument, geminiModel as gemini25Flash } from '../../../lib/services/gemini-client';

