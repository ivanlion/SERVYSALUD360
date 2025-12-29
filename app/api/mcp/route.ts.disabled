/**
 * API Route para el servidor MCP (Model Context Protocol)
 * 
 * Este endpoint expone el servidor MCP como un API route de Next.js
 * que maneja requests JSON-RPC 2.0 y retorna respuestas del servidor MCP
 * 
 * @route POST /api/mcp
 * @module app/api/mcp/route
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Handler POST para el endpoint MCP
 * 
 * Maneja requests JSON-RPC 2.0 y los procesa a través del servidor MCP
 * 
 * @param request - Request de Next.js con el body JSON-RPC
 * @returns Response con la respuesta del servidor MCP en formato JSON-RPC 2.0
 */
export async function POST(request: NextRequest) {
  try {
    // Parsear el body del request como JSON
    const body = await request.json();

    // Validar que el body tenga el formato JSON-RPC 2.0 básico
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: body?.id || null,
          error: {
            code: -32700,
            message: 'Parse error',
          },
        },
        { status: 400 }
      );
    }

    // Importar dinámicamente el servidor MCP (permite mejor tree-shaking)
    // El servidor MCP debería exportar una función handleRequest o similar
    // Next.js transpilará automáticamente el TypeScript gracias a transpilePackages
    const mcpServer = await import('../../../mcp-server/src/index') as any;
    
    // El servidor MCP exporta handleRequest directamente
    const handleRequest = mcpServer.handleRequest;
    
    if (!handleRequest || typeof handleRequest !== 'function') {
      throw new Error('MCP Server no exporta una función handleRequest válida');
    }

    // Procesar el request a través del servidor MCP
    const response = await handleRequest(body);

    // Retornar la respuesta en formato JSON-RPC 2.0
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Manejar errores de parsing o procesamiento
    console.error('[MCP Route] Error procesando request:', error);

    // Retornar error en formato JSON-RPC 2.0
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Handler OPTIONS para CORS preflight (si es necesario)
 * 
 * @returns Response con headers CORS permitidos
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

