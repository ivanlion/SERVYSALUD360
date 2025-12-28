/**
 * Herramientas MCP para gestión de almacenamiento (Storage)
 * 
 * @module mcp-server/src/tools/storage
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseClient } from '@supabase/supabase-js';

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
      const { bucket, path = '' } = args;
      
      if (!bucket) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Se requiere el parámetro "bucket"',
            },
          ],
          isError: true,
        };
      }
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path);
      
      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al listar archivos: ${error.message}`,
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

    case 'storage_descargar': {
      const { bucket, path } = args;
      
      if (!bucket || !path) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Se requieren los parámetros "bucket" y "path"',
            },
          ],
          isError: true,
        };
      }
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);
      
      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error al descargar archivo: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
      
      // Convertir el blob a base64 para preservar datos binarios (PDFs, imágenes, etc.)
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
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
      return {
        content: [
          {
            type: 'text',
            text: `Herramienta de storage desconocida: ${toolName}`,
          },
        ],
        isError: true,
      };
  }
}

