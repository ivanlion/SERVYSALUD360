/**
 * Herramientas MCP para gestión de empresas
 * 
 * Integrado con el sistema de multi-tenancy
 * 
 * @module mcp-server/src/tools/empresas
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { empresasListarSchema, empresasObtenerSchema, empresasBuscarSchema, empresasCrearSchema } from './schemas/empresas';
import { generateCacheKey, getFromCache, setInCache } from '../utils/cache';
import { createMCPError, createValidationError, createSupabaseError } from '../utils/errors';
import { mcpLogger } from '../utils/logger';

/**
 * Define las herramientas relacionadas con empresas
 */
export const empresasTools: Tool[] = [
  {
    name: 'empresas_listar',
    description: 'Lista todas las empresas asociadas al usuario actual',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'ID del usuario (opcional, si no se proporciona se usa el usuario autenticado)',
        },
      },
    },
  },
  {
    name: 'empresas_obtener',
    description: 'Obtiene una empresa específica por ID',
    inputSchema: {
      type: 'object',
      properties: {
        empresa_id: {
          type: 'string',
          description: 'ID de la empresa',
        },
      },
      required: ['empresa_id'],
    },
  },
  {
    name: 'empresas_buscar',
    description: 'Busca empresas por nombre o RUC',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Término de búsqueda (nombre o RUC)',
        },
        user_id: {
          type: 'string',
          description: 'ID del usuario para filtrar (opcional)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'empresas_crear',
    description: 'Crea una nueva empresa y la asocia al usuario',
    inputSchema: {
      type: 'object',
      properties: {
        nombre: {
          type: 'string',
          description: 'Nombre de la empresa',
        },
        ruc: {
          type: 'string',
          description: 'RUC de la empresa (opcional)',
        },
        direccion: {
          type: 'string',
          description: 'Dirección de la empresa (opcional)',
        },
        telefono: {
          type: 'string',
          description: 'Teléfono de la empresa (opcional)',
        },
        email: {
          type: 'string',
          description: 'Email de la empresa (opcional)',
        },
        user_id: {
          type: 'string',
          description: 'ID del usuario que crea la empresa (opcional)',
        },
      },
      required: ['nombre'],
    },
  },
];

/**
 * Maneja la ejecución de herramientas de empresas
 */
export async function handleEmpresasTool(
  toolName: string,
  args: Record<string, any>,
  supabase: SupabaseClient
): Promise<any> {
  switch (toolName) {
    case 'empresas_listar': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = empresasListarSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en empresas_listar', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { user_id } = validatedArgs;
      
      // ✅ MEJORA: Verificar caché
      const cacheKey = generateCacheKey(toolName, validatedArgs);
      const cached = getFromCache(cacheKey);
      if (cached) {
        mcpLogger.debug('Resultado obtenido del caché', { toolName, cacheKey });
        return cached;
      }
      
      mcpLogger.debug('Ejecutando empresas_listar', { user_id });
      
      try {
        // Si no se proporciona user_id, intentar obtenerlo del contexto
        // Nota: En MCP, normalmente no tenemos acceso directo al usuario autenticado
        // Por lo que user_id debe pasarse explícitamente o obtenerse de otra forma
        
        let query = supabase
          .from('user_empresas')
          .select('empresa_id, empresas(*)');
        
        if (user_id) {
          query = query.eq('user_id', user_id);
        }
        
        const { data, error } = await query;
        
        if (error) {
          mcpLogger.error(new Error(`Error al listar empresas: ${error.message}`), { 
            toolName, 
            user_id,
            error: error.message,
            code: error.code 
          });
          return createSupabaseError(error, 'Error al listar empresas');
        }
        
        // Transformar datos para devolver solo las empresas
        const empresas = (data || [])
          .map((ue: any) => ue.empresas)
          .filter(Boolean);
        
        const result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(empresas, null, 2),
            },
          ],
        };
        
        // ✅ MEJORA: Guardar en caché
        setInCache(cacheKey, result);
        mcpLogger.debug('Resultado guardado en caché', { toolName, cacheKey, empresaCount: empresas.length });
        
        return result;
      } catch (error: any) {
        mcpLogger.error(error instanceof Error ? error : new Error('Error inesperado en empresas_listar'), { user_id });
        return createMCPError(
          `Error inesperado: ${error.message}`,
          'UNEXPECTED_ERROR',
          { error: error.message }
        );
      }
    }

    case 'empresas_obtener': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = empresasObtenerSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en empresas_obtener', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { empresa_id } = validatedArgs;
      
      // ✅ MEJORA: Verificar caché
      const cacheKey = generateCacheKey(toolName, validatedArgs);
      const cached = getFromCache(cacheKey);
      if (cached) {
        mcpLogger.debug('Resultado obtenido del caché', { toolName, empresa_id });
        return cached;
      }
      
      mcpLogger.debug('Ejecutando empresas_obtener', { empresa_id });
      
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, ruc, direccion, telefono, email, nombre_comercial, actividades_economicas, activa, created_at, updated_at')
        .eq('id', empresa_id)
        .single();
      
      if (error) {
        mcpLogger.error(new Error(`Error al obtener empresa: ${error.message}`), { 
          toolName, 
          empresa_id,
          error: error.message,
          code: error.code 
        });
        return createSupabaseError(error, 'Error al obtener empresa');
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
      mcpLogger.debug('Resultado guardado en caché', { toolName, empresa_id });
      
      return result;
    }

    case 'empresas_buscar': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = empresasBuscarSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en empresas_buscar', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { query, user_id } = validatedArgs;
      
      // ✅ MEJORA: Verificar caché (búsquedas pueden ser costosas)
      const cacheKey = generateCacheKey(toolName, validatedArgs);
      const cached = getFromCache(cacheKey);
      if (cached) {
        mcpLogger.debug('Resultado obtenido del caché', { toolName, query });
        return cached;
      }
      
      mcpLogger.debug('Ejecutando empresas_buscar', { query, user_id });
      
      try {
        // Primero obtener empresas del usuario si se proporciona user_id
        let empresaIds: string[] | null = null;
        
        if (user_id) {
          const { data: userEmpresas } = await supabase
            .from('user_empresas')
            .select('empresa_id')
            .eq('user_id', user_id);
          
          empresaIds = userEmpresas?.map((ue: any) => ue.empresa_id) || null;
        }
        
        // Buscar empresas
        let empresasQuery = supabase
          .from('empresas')
          .select('id, nombre, ruc, direccion, telefono, email, nombre_comercial, actividades_economicas, activa, created_at, updated_at')
          .or(`nombre.ilike.%${query}%,ruc.ilike.%${query}%`);
        
        // Filtrar por empresas del usuario si se proporcionó user_id
        if (empresaIds && empresaIds.length > 0) {
          empresasQuery = empresasQuery.in('id', empresaIds);
        }
        
        const { data, error } = await empresasQuery;
        
        if (error) {
          mcpLogger.error(new Error(`Error al buscar empresas: ${error.message}`), { 
            toolName, 
            query,
            user_id,
            error: error.message,
            code: error.code 
          });
          return createSupabaseError(error, 'Error al buscar empresas');
        }
        
        const result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data || [], null, 2),
            },
          ],
        };
        
        // ✅ MEJORA: Guardar en caché
        setInCache(cacheKey, result);
        mcpLogger.debug('Resultado guardado en caché', { toolName, query, dataCount: data?.length || 0 });
        
        return result;
      } catch (error: any) {
        mcpLogger.error(error instanceof Error ? error : new Error('Error inesperado en empresas_buscar'), { query, user_id });
        return createMCPError(
          `Error inesperado: ${error.message}`,
          'UNEXPECTED_ERROR',
          { error: error.message }
        );
      }
    }

    case 'empresas_crear': {
      // ✅ MEJORA: Validación con Zod
      let validatedArgs;
      try {
        validatedArgs = empresasCrearSchema.parse(args);
      } catch (validationError: any) {
        mcpLogger.warn('Error de validación en empresas_crear', { args, error: validationError });
        return createValidationError(validationError.errors || [validationError]);
      }
      
      const { nombre, ruc, direccion, telefono, email, user_id } = validatedArgs;
      
      // Nota: No usamos caché para crear porque es una operación de escritura
      
      mcpLogger.debug('Ejecutando empresas_crear', { nombre, ruc, user_id });
      
      try {
        // Crear empresa
        const { data: empresa, error: empresaError } = await supabase
          .from('empresas')
          .insert([{
            nombre: nombre.trim(),
            ruc: ruc?.trim() || null,
            direccion: direccion?.trim() || null,
            telefono: telefono?.trim() || null,
            email: email?.trim() || null,
            activa: true,
          }])
          .select()
          .single();
        
        if (empresaError || !empresa) {
          mcpLogger.error(new Error(`Error al crear empresa: ${empresaError?.message || 'Error desconocido'}`), { 
            toolName, 
            nombre,
            error: empresaError?.message,
            code: empresaError?.code 
          });
          return createSupabaseError(empresaError || new Error('Error desconocido'), 'Error al crear empresa');
        }
        
        // Si se proporciona user_id, asociar empresa al usuario
        if (user_id) {
          const { error: userEmpresaError } = await supabase
            .from('user_empresas')
            .insert([{
              user_id,
              empresa_id: empresa.id,
            }]);
          
          if (userEmpresaError) {
            // Si falla la asociación, eliminar la empresa creada
            await supabase.from('empresas').delete().eq('id', empresa.id);
            
            mcpLogger.error(new Error(`Error al asociar empresa al usuario: ${userEmpresaError.message}`), { 
              toolName, 
              empresa_id: empresa.id,
              user_id,
              error: userEmpresaError.message,
              code: userEmpresaError.code 
            });
            return createSupabaseError(userEmpresaError, 'Error al asociar empresa al usuario');
          }
        }
        
        mcpLogger.debug('Empresa creada exitosamente', { empresa_id: empresa.id, nombre });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(empresa, null, 2),
            },
          ],
        };
      } catch (error: any) {
        mcpLogger.error(error instanceof Error ? error : new Error('Error inesperado en empresas_crear'), { nombre, user_id });
        return createMCPError(
          `Error inesperado: ${error.message}`,
          'UNEXPECTED_ERROR',
          { error: error.message }
        );
      }
    }

    default:
      mcpLogger.warn('Herramienta de empresas desconocida', { toolName });
      return createMCPError(
        `Herramienta de empresas desconocida: ${toolName}`,
        'UNKNOWN_TOOL',
        { toolName, availableTools: ['empresas_listar', 'empresas_obtener', 'empresas_buscar', 'empresas_crear'] }
      );
  }
}

