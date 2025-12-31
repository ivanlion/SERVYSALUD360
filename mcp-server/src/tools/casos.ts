/**
 * Herramientas MCP para gestión de casos
 * 
 * @module mcp-server/src/tools/casos
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { casosListarSchema, casosObtenerSchema, casosBuscarSchema } from './schemas/casos';
import { generateCacheKey, getFromCache, setInCache } from '../utils/cache';
import { createMCPError, createValidationError, createSupabaseError } from '../utils/errors';
import { mcpLogger } from '../utils/logger';

/**
 * Define las herramientas relacionadas con casos
 */
export const casosTools: Tool[] = [
  {
    name: 'casos_listar',
    description: 'Lista todos los casos de trabajo modificado',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de casos a retornar',
        },
        status: {
          type: 'string',
          description: 'Filtrar por estado (ACTIVO, CERRADO)',
          enum: ['ACTIVO', 'CERRADO'],
        },
        empresa_id: {
          type: 'string',
          description: 'ID de la empresa para filtrar casos (opcional, para multi-tenancy)',
        },
      },
    },
  },
  {
    name: 'casos_obtener',
    description: 'Obtiene un caso específico por ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID del caso',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'casos_buscar',
    description: 'Busca casos por trabajador, DNI o empresa',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Término de búsqueda (nombre, DNI o empresa)',
        },
      },
      required: ['query'],
    },
  },
];

/**
 * Maneja la ejecución de herramientas de casos
 */
export async function handleCasosTool(
  toolName: string,
  args: Record<string, any>,
  supabase: SupabaseClient
): Promise<any> {
  switch (toolName) {
    case 'casos_listar': {
      // ✅ MEJORA: Validación con Zod para prevenir errores en runtime
      let validatedArgs;
      try {
        validatedArgs = casosListarSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en casos_listar', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { limit = 100, offset = 0, status, empresa_id } = validatedArgs;
      
      // ✅ MEJORA: Verificar caché antes de hacer consulta
      const cacheKey = generateCacheKey(toolName, validatedArgs);
      const cached = getFromCache(cacheKey);
      if (cached) {
        mcpLogger.debug('Resultado obtenido del caché', { toolName, cacheKey });
        return cached;
      }
      
      mcpLogger.debug('Ejecutando casos_listar', { limit, offset, status, empresa_id });
      
      // ✅ MEJORA: Paginación completa con range
      let query = supabase
        .from('casos')
        .select('id, fecha, status, empresa_id, trabajador_id, tipo_evento, created_at, updated_at', { count: 'exact' })
        .range(offset, offset + limit - 1);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      // Filtrar por empresa si se proporciona (multi-tenancy)
      if (empresa_id) {
        query = query.eq('empresa_id', empresa_id);
      }
      
      const { data, error, count } = await query.order('fecha', { ascending: false });
      
      if (error) {
        mcpLogger.error(new Error(`Error al listar casos: ${error.message}`), { 
          toolName, 
          error: error.message,
          code: error.code 
        });
        return createSupabaseError(error, 'Error al listar casos');
      }
      
      // ✅ MEJORA: Incluir información de paginación en la respuesta
      const result = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              data,
              pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: count ? offset + limit < count : false,
              },
            }, null, 2),
          },
        ],
      };
      
      // ✅ MEJORA: Guardar en caché
      setInCache(cacheKey, result);
      mcpLogger.debug('Resultado guardado en caché', { toolName, cacheKey, dataCount: data?.length || 0 });
      
      return result;
    }

    case 'casos_obtener': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = casosObtenerSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en casos_obtener', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { id } = validatedArgs;
      
      // ✅ MEJORA: Verificar caché
      const cacheKey = generateCacheKey(toolName, validatedArgs);
      const cached = getFromCache(cacheKey);
      if (cached) {
        mcpLogger.debug('Resultado obtenido del caché', { toolName, id });
        return cached;
      }
      
      mcpLogger.debug('Ejecutando casos_obtener', { id });
      
      const { data, error } = await supabase
        .from('casos')
        .select('id, fecha, status, empresa_id, trabajador_id, tipo_evento, datos, created_at, updated_at')
        .eq('id', id)
        .single();
      
      if (error) {
        mcpLogger.error(new Error(`Error al obtener caso: ${error.message}`), { 
          toolName, 
          id,
          error: error.message,
          code: error.code 
        });
        return createSupabaseError(error, 'Error al obtener caso');
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
      mcpLogger.debug('Resultado guardado en caché', { toolName, id });
      
      return result;
    }

    case 'casos_buscar': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = casosBuscarSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en casos_buscar', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { query } = validatedArgs;
      
      // ✅ MEJORA: Verificar caché (búsquedas pueden ser costosas)
      const cacheKey = generateCacheKey(toolName, validatedArgs);
      const cached = getFromCache(cacheKey);
      if (cached) {
        mcpLogger.debug('Resultado obtenido del caché', { toolName, query });
        return cached;
      }
      
      mcpLogger.debug('Ejecutando casos_buscar', { query });
      
      const { data, error } = await supabase
        .from('casos')
        .select('id, fecha, status, empresa_id, trabajador_id, tipo_evento, datos, created_at, updated_at')
        .or(`trabajadorNombre.ilike.%${query}%,dni.ilike.%${query}%,empresa.ilike.%${query}%`)
        .limit(50);
      
      if (error) {
        mcpLogger.error(new Error(`Error al buscar casos: ${error.message}`), { 
          toolName, 
          query,
          error: error.message,
          code: error.code 
        });
        return createSupabaseError(error, 'Error al buscar casos');
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
      mcpLogger.debug('Resultado guardado en caché', { toolName, query, dataCount: data?.length || 0 });
      
      return result;
    }

    default:
      mcpLogger.warn('Herramienta de casos desconocida', { toolName });
      return createMCPError(
        `Herramienta de casos desconocida: ${toolName}`,
        'UNKNOWN_TOOL',
        { toolName, availableTools: ['casos_listar', 'casos_obtener', 'casos_buscar'] }
      );
  }
}

