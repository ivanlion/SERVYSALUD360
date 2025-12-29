/**
 * Herramientas MCP para gestión de casos
 * 
 * @module mcp-server/src/tools/casos
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseClient } from '@supabase/supabase-js';

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
      const { limit = 100, status, empresa_id } = args;
      
      let query = supabase
        .from('casos')
        .select('*')
        .limit(limit);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      // Filtrar por empresa si se proporciona (multi-tenancy)
      if (empresa_id) {
        query = query.eq('empresa_id', empresa_id);
      }
      
      const { data, error } = await query.order('fecha', { ascending: false });
      
      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al listar casos: ${error.message}`,
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

    case 'casos_obtener': {
      const { id } = args;
      
      if (!id) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Se requiere el parámetro "id"',
            },
          ],
          isError: true,
        };
      }
      
      const { data, error } = await supabase
        .from('casos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener caso: ${error.message}`,
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

    case 'casos_buscar': {
      const { query } = args;
      
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
      
      const { data, error } = await supabase
        .from('casos')
        .select('*')
        .or(`trabajadorNombre.ilike.%${query}%,dni.ilike.%${query}%,empresa.ilike.%${query}%`)
        .limit(50);
      
      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al buscar casos: ${error.message}`,
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

    default:
      return {
        content: [
          {
            type: 'text',
            text: `Herramienta de casos desconocida: ${toolName}`,
          },
        ],
        isError: true,
      };
  }
}

