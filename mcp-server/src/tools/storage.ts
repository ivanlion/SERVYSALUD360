/**
 * Herramientas MCP para gestión de almacenamiento (Storage)
 * 
 * @module mcp-server/src/tools/storage
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { storageListarSchema, storageDescargarSchema } from './schemas/storage';
import { generateCacheKey, getFromCache, setInCache } from '../utils/cache';
import { createMCPError, createValidationError, createSupabaseError } from '../utils/errors';
import { mcpLogger } from '../utils/logger';

/**
 * Define las herramientas relacionadas con storage
 */
export const storageTools: Tool[] = [
  {
    name: 'storage_listar',
    description: 'Lista archivos en un bucket de storage',
    inputSchema: {
      type: 'object',
      properties: {
        bucket: {
          type: 'string',
          description: 'Nombre del bucket',
        },
        path: {
          type: 'string',
          description: 'Ruta dentro del bucket (opcional)',
        },
      },
      required: ['bucket'],
    },
  },
  {
    name: 'storage_descargar',
    description: 'Descarga un archivo de storage',
    inputSchema: {
      type: 'object',
      properties: {
        bucket: {
          type: 'string',
          description: 'Nombre del bucket',
        },
        path: {
          type: 'string',
          description: 'Ruta del archivo dentro del bucket',
        },
      },
      required: ['bucket', 'path'],
    },
  },
];

/**
 * Maneja la ejecución de herramientas de storage
 */
export async function handleStorageTool(
  toolName: string,
  args: Record<string, any>,
  supabase: SupabaseClient
): Promise<any> {
  switch (toolName) {
    case 'storage_listar': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = storageListarSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en storage_listar', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { bucket, path = '' } = validatedArgs;
      
      // ✅ MEJORA: Verificar caché
      const cacheKey = generateCacheKey(toolName, validatedArgs);
      const cached = getFromCache(cacheKey);
      if (cached) {
        mcpLogger.debug('Resultado obtenido del caché', { toolName, bucket, path });
        return cached;
      }
      
      mcpLogger.debug('Ejecutando storage_listar', { bucket, path });
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path);
      
      if (error) {
        mcpLogger.error(new Error(`Error al listar archivos: ${error.message}`), { 
          toolName, 
          bucket,
          path,
          error: error.message,
          code: error.code 
        });
        return createSupabaseError(error, 'Error al listar archivos');
      }
      
      const result = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
      
      // ✅ MEJORA: Guardar en caché
      setInCache(cacheKey, result);
      mcpLogger.debug('Resultado guardado en caché', { toolName, bucket, path, fileCount: data?.length || 0 });
      
      return result;
    }

    case 'storage_descargar': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = storageDescargarSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en storage_descargar', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { bucket, path } = validatedArgs;
      
      // Nota: No usamos caché para descargas porque los archivos pueden cambiar
      
      mcpLogger.debug('Ejecutando storage_descargar', { bucket, path });
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);
      
      if (error) {
        // Mejorar mensaje de error según el tipo de error
        let errorMessage = `Error al descargar archivo: ${error.message}`;
        const errorStr = error.message || '';
        
        if (errorStr.includes('Object not found') || errorStr.includes('404') || errorStr.includes('not found')) {
          errorMessage = `El archivo "${path}" no existe en el bucket "${bucket}"`;
        } else if (errorStr.includes('new row violates row-level security policy') || errorStr.includes('row-level security')) {
          errorMessage = `No tienes permisos para acceder al archivo "${path}"`;
        } else if (errorStr.includes('403') || errorStr.includes('Forbidden') || errorStr.includes('Access denied')) {
          errorMessage = `Acceso denegado al archivo "${path}". Verifica tus permisos.`;
        }
        
        mcpLogger.error(new Error(errorMessage), { 
          toolName, 
          bucket,
          path,
          error: error.message,
          code: error.code 
        });
        
        return createSupabaseError(error, errorMessage);
      }
      
      // Convertir el blob a base64 para preservar datos binarios (PDFs, imágenes, etc.)
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
      mcpLogger.debug('Archivo descargado exitosamente', { bucket, path, sizeBytes: buffer.length });
      
      return {
        content: [
          {
            type: 'text',
            text: base64,
          },
        ],
      };
    }

    default:
      mcpLogger.warn('Herramienta de storage desconocida', { toolName });
      return createMCPError(
        `Herramienta de storage desconocida: ${toolName}`,
        'UNKNOWN_TOOL',
        { toolName, availableTools: ['storage_listar', 'storage_descargar'] }
      );
  }
}

