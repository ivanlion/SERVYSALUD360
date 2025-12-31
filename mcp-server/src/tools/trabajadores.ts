/**
 * Herramientas MCP para gestión de trabajadores
 * 
 * @module mcp-server/src/tools/trabajadores
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseClient } from '@supabase/supabase-js';

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
      const { limit = 100, empresa_id } = args;
      
      let query = supabase
        .from('registros_trabajadores')
        .select('*')
        .limit(limit);
      
      // Filtrar por empresa si se proporciona (multi-tenancy)
      if (empresa_id) {
        query = query.eq('empresa_id', empresa_id);
      }
      
      const { data, error } = await query.order('fecha_registro', { ascending: false });
      
      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al listar trabajadores: ${error.message}`,
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

    case 'trabajadores_obtener': {
      const { dni } = args;
      
      if (!dni) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Se requiere el parámetro "dni"',
            },
          ],
          isError: true,
        };
      }
      
      const { data, error } = await supabase
        .from('registros_trabajadores')
        .select('id, fecha_registro, apellidos_nombre, dni_ce_pas, telefono_trabajador, sexo, jornada_laboral, puesto_trabajo, empresa, gerencia, supervisor_responsable, telf_contacto_supervisor, empresa_id, created_at')
        .eq('dni_ce_pas', dni)
        .single();
      
      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al obtener trabajador: ${error.message}`,
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
            text: `Herramienta de trabajadores desconocida: ${toolName}`,
          },
        ],
        isError: true,
      };
  }
}

