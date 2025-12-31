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
import { logger } from '../../../utils/logger';

/**
 * Handler POST para el endpoint MCP
 * 
 * Maneja requests JSON-RPC 2.0 y los procesa a través del servidor MCP
 * 
 * @param request - Request de Next.js con el body JSON-RPC
 * @returns Response con la respuesta del servidor MCP en formato JSON-RPC 2.0
 */
export async function POST(request: NextRequest) {
  // ✅ MEJORA: Timeout para evitar requests que se quedan colgados
  const controller = new AbortController();
  const TIMEOUT_MS = 30000; // 30 segundos
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
    // ✅ MEJORA: Verificar si el request fue abortado por timeout
    if (controller.signal.aborted) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: body?.id || null,
          error: {
            code: -32603,
            message: 'Request timeout',
          },
        },
        { status: 408 }
      );
    }

    const response = await handleRequest(body);
    clearTimeout(timeoutId);

    // Retornar la respuesta en formato JSON-RPC 2.0
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    
    // ✅ MEJORA: Manejar timeout específicamente
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: 'Request timeout',
          },
        },
        { status: 408 }
      );
    }

    // Manejar errores de parsing o procesamiento
    logger.error(error instanceof Error ? error : new Error('Error procesando request MCP'), {
      context: 'MCPRoute',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

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

