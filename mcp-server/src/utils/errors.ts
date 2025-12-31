/**
 * Utilidades para manejo estandarizado de errores en MCP
 * 
 * @module mcp-server/src/utils/errors
 */

/**
 * Respuesta de error estandarizada para MCP
 */
export interface MCPErrorResponse {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
  error_code?: string;
  error_details?: Record<string, any>;
}

/**
 * Crea una respuesta de error estandarizada
 * 
 * @param message - Mensaje de error
 * @param code - Código de error opcional
 * @param details - Detalles adicionales del error
 * @returns Respuesta de error MCP
 */
export function createMCPError(
  message: string,
  code?: string,
  details?: Record<string, any>
): MCPErrorResponse {
  const error: MCPErrorResponse = {
    isError: true,
    content: [{ type: 'text', text: message }],
  };

  if (code) {
    error.error_code = code;
  }

  if (details) {
    error.error_details = details;
  }

  return error;
}

/**
 * Crea un error de validación
 * 
 * @param validationErrors - Errores de validación (típicamente de Zod)
 * @returns Respuesta de error MCP
 */
export function createValidationError(validationErrors: any[]): MCPErrorResponse {
  const messages = validationErrors.map((e: any) => {
    const path = e.path?.join('.') || 'unknown';
    return `${path}: ${e.message}`;
  });

  return createMCPError(
    `Error de validación: ${messages.join(', ')}`,
    'VALIDATION_ERROR',
    { errors: validationErrors }
  );
}

/**
 * Crea un error de Supabase
 * 
 * @param error - Error de Supabase (puede ser PostgrestError, StorageError, etc.)
 * @param context - Contexto adicional
 * @returns Respuesta de error MCP
 */
export function createSupabaseError(
  error: any,
  context?: string
): MCPErrorResponse {
  const message = error.message || 'Error desconocido de Supabase';
  // Nota: StorageError no tiene propiedad 'code', solo PostgrestError la tiene
  const code = (error as any).code || 'SUPABASE_ERROR';
  
  return createMCPError(
    context ? `${context}: ${message}` : message,
    code,
    {
      // Solo incluir propiedades si existen (StorageError no tiene code, hint, details)
      ...((error as any).code && { supabase_code: (error as any).code }),
      ...((error as any).hint && { supabase_hint: (error as any).hint }),
      ...((error as any).details && { supabase_details: (error as any).details }),
    }
  );
}

/**
 * Crea un error de permisos
 * 
 * @param toolName - Nombre de la herramienta
 * @returns Respuesta de error MCP
 */
export function createPermissionError(toolName: string): MCPErrorResponse {
  return createMCPError(
    `No tiene permisos para ejecutar la herramienta: ${toolName}`,
    'PERMISSION_DENIED',
    { tool: toolName }
  );
}

