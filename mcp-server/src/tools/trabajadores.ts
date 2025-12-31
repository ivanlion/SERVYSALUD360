/**
 * Herramientas MCP para gestión de trabajadores
 * 
 * @module mcp-server/src/tools/trabajadores
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { trabajadoresListarSchema, trabajadoresObtenerSchema } from './schemas/trabajadores';
import { generateCacheKey, getFromCache, setInCache } from '../utils/cache';
import { createMCPError, createValidationError, createSupabaseError } from '../utils/errors';
import { mcpLogger } from '../utils/logger';

/**
 * Define las herramientas relacionadas con trabajadores
 */
export const trabajadoresTools: Tool[] = [
  {
    name: 'trabajadores_listar',
    description: 'Lista todos los trabajadores registrados',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de trabajadores a retornar',
        },
        empresa_id: {
          type: 'string',
          description: 'ID de la empresa para filtrar trabajadores (opcional, para multi-tenancy)',
        },
      },
    },
  },
  {
    name: 'trabajadores_obtener',
    description: 'Obtiene un trabajador específico por DNI',
    inputSchema: {
      type: 'object',
      properties: {
        dni: {
          type: 'string',
          description: 'DNI del trabajador',
        },
      },
      required: ['dni'],
    },
  },
];

/**
 * Maneja la ejecución de herramientas de trabajadores
 */
export async function handleTrabajadoresTool(
  toolName: string,
  args: Record<string, any>,
  supabase: SupabaseClient
): Promise<any> {
  switch (toolName) {
    case 'trabajadores_listar': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = trabajadoresListarSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en trabajadores_listar', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { limit = 100, offset = 0, empresa_id } = validatedArgs;
      
      // ✅ MEJORA: Verificar caché
      const cacheKey = generateCacheKey(toolName, validatedArgs);
      const cached = getFromCache(cacheKey);
      if (cached) {
        mcpLogger.debug('Resultado obtenido del caché', { toolName, cacheKey });
        return cached;
      }
      
      mcpLogger.debug('Ejecutando trabajadores_listar', { limit, offset, empresa_id });
      
      // ✅ MEJORA: Paginación completa con range
      let query = supabase
        .from('registros_trabajadores')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1);
      
      // Filtrar por empresa si se proporciona (multi-tenancy)
      if (empresa_id) {
        query = query.eq('empresa_id', empresa_id);
      }
      
      const { data, error, count } = await query.order('fecha_registro', { ascending: false });
      
      if (error) {
        mcpLogger.error(new Error(`Error al listar trabajadores: ${error.message}`), { 
          toolName, 
          error: error.message,
          code: error.code 
        });
        return createSupabaseError(error, 'Error al listar trabajadores');
      }
      
      // ✅ MEJORA: Incluir información de paginación
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

    case 'trabajadores_obtener': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = trabajadoresObtenerSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en trabajadores_obtener', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { dni } = validatedArgs;
      
      // ✅ MEJORA: Verificar caché
      const cacheKey = generateCacheKey(toolName, validatedArgs);
      const cached = getFromCache(cacheKey);
      if (cached) {
        mcpLogger.debug('Resultado obtenido del caché', { toolName, dni });
        return cached;
      }
      
      mcpLogger.debug('Ejecutando trabajadores_obtener', { dni });
      
      const { data, error } = await supabase
        .from('registros_trabajadores')
        .select('id, fecha_registro, apellidos_nombre, dni_ce_pas, telefono_trabajador, sexo, jornada_laboral, puesto_trabajo, empresa, gerencia, supervisor_responsable, telf_contacto_supervisor, empresa_id, created_at')
        .eq('dni_ce_pas', dni)
        .single();
      
      if (error) {
        mcpLogger.error(new Error(`Error al obtener trabajador: ${error.message}`), { 
          toolName, 
          dni,
          error: error.message,
          code: error.code 
        });
        return createSupabaseError(error, 'Error al obtener trabajador');
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
      mcpLogger.debug('Resultado guardado en caché', { toolName, dni });
      
      return result;
    }

    default:
      mcpLogger.warn('Herramienta de trabajadores desconocida', { toolName });
      return createMCPError(
        `Herramienta de trabajadores desconocida: ${toolName}`,
        'UNKNOWN_TOOL',
        { toolName, availableTools: ['trabajadores_listar', 'trabajadores_obtener'] }
      );
  }
}

