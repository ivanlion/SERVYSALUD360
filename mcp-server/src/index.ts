/**
 * Servidor MCP (Model Context Protocol) para SERVYSALUD360
 * 
 * Este servidor expone herramientas para interactuar con Supabase
 * y gestionar datos de salud ocupacional
 * 
 * @module mcp-server/src/index
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { initSupabaseClient } from './services/supabase';
import { listTools, handleToolCall } from './tools/index';

/**
 * Inicializa y configura el servidor MCP
 */
async function createMCPServer() {
  // Inicializar cliente de Supabase
  const supabase = initSupabaseClient();

  // Crear servidor MCP
  const server = new Server(
    {
      name: 'servysalud360-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Handler para listar herramientas disponibles
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: await listTools(),
    };
  });

  // Handler para ejecutar herramientas
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return await handleToolCall(request.params.name, request.params.arguments || {}, supabase);
  });

  // Handler para listar recursos (opcional, para futuras implementaciones)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [],
    };
  });

  // Handler para leer recursos (opcional, para futuras implementaciones)
  server.setRequestHandler(ReadResourceRequestSchema, async () => {
    throw new Error('ReadResource not implemented');
  });

  return server;
}

/**
 * Maneja un request JSON-RPC 2.0
 * 
 * Esta función es la que exporta el servidor para ser usada desde el API route
 * 
 * @param request - Request JSON-RPC 2.0
 * @returns Promise con la respuesta JSON-RPC 2.0
 */
export async function handleRequest(request: any): Promise<any> {
  try {
    // Nota: createMCPServer() se usa en main() para modo stdio
    // Para HTTP/API routes, manejamos los requests directamente

    // Crear un transport en memoria para procesar el request
    // Nota: El SDK de MCP está diseñado para stdio, pero podemos adaptarlo
    // para requests HTTP usando un enfoque diferente
    
    // Por ahora, implementamos un manejo directo basado en el método
    const { method, params, id } = request;

    switch (method) {
      case 'tools/list': {
        const tools = await listTools();
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools,
          },
        };
      }

      case 'tools/call': {
        const { name, arguments: args } = params || {};
        const supabase = initSupabaseClient();
        const result = await handleToolCall(name, args || {}, supabase);
        
        // Si el resultado tiene isError: true, convertirlo en un error JSON-RPC
        if (result && result.isError === true) {
          const errorMessage = result.content?.[0]?.text || 'Error desconocido en la herramienta';
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32603,
              message: errorMessage,
            },
          };
        }
        
        return {
          jsonrpc: '2.0',
          id,
          result,
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Inicializa el servidor MCP en modo stdio (para uso directo como proceso)
 * 
 * Esta función se usa cuando el servidor se ejecuta como un proceso independiente
 */
export async function main() {
  const server = await createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Servidor MCP de SERVYSALUD360 iniciado');
}

// Si este archivo se ejecuta directamente (no importado), iniciar el servidor
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error al iniciar el servidor MCP:', error);
    process.exit(1);
  });
}

