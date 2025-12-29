/**
 * Herramientas MCP para gestión de empresas
 * 
 * Integrado con el sistema de multi-tenancy
 * 
 * @module mcp-server/src/tools/empresas
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseClient } from '@supabase/supabase-js';

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
      const { user_id } = args;
      
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
          return {
            content: [
              {
                type: 'text',
                text: `Error al listar empresas: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
        
        // Transformar datos para devolver solo las empresas
        const empresas = (data || [])
          .map((ue: any) => ue.empresas)
          .filter(Boolean);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(empresas, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error inesperado: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'empresas_obtener': {
      const { empresa_id } = args;
      
      if (!empresa_id) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Se requiere el parámetro "empresa_id"',
            },
          ],
          isError: true,
        };
      }
      
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresa_id)
        .single();
      
      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener empresa: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    case 'empresas_buscar': {
      const { query, user_id } = args;
      
      if (!query) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Se requiere el parámetro "query"',
            },
          ],
          isError: true,
        };
      }
      
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
          .select('*')
          .or(`nombre.ilike.%${query}%,ruc.ilike.%${query}%`);
        
        // Filtrar por empresas del usuario si se proporcionó user_id
        if (empresaIds && empresaIds.length > 0) {
          empresasQuery = empresasQuery.in('id', empresaIds);
        }
        
        const { data, error } = await empresasQuery;
        
        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error al buscar empresas: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data || [], null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error inesperado: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'empresas_crear': {
      const { nombre, ruc, direccion, telefono, email, user_id } = args;
      
      if (!nombre) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Se requiere el parámetro "nombre"',
            },
          ],
          isError: true,
        };
      }
      
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
          return {
            content: [
              {
                type: 'text',
                text: `Error al crear empresa: ${empresaError?.message || 'Error desconocido'}`,
              },
            ],
            isError: true,
          };
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
            
            return {
              content: [
                {
                  type: 'text',
                  text: `Error al asociar empresa al usuario: ${userEmpresaError.message}`,
                },
              ],
              isError: true,
            };
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(empresa, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error inesperado: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      return {
        content: [
          {
            type: 'text',
            text: `Herramienta de empresas desconocida: ${toolName}`,
          },
        ],
        isError: true,
      };
  }
}

