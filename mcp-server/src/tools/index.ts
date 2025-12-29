/**
 * Índice de herramientas MCP
 * 
 * Exporta todas las herramientas disponibles y maneja su ejecución
 * 
 * @module mcp-server/src/tools/index
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Importar herramientas específicas
import { casosTools, handleCasosTool } from './casos';
import { trabajadoresTools, handleTrabajadoresTool } from './trabajadores';
import { examenesTools, handleExamenesTool } from './examenes';
import { storageTools, handleStorageTool } from './storage';
import { analyticsTools, handleAnalyticsTool } from './analytics';
import { empresasTools, handleEmpresasTool } from './empresas';

/**
 * Lista todas las herramientas disponibles
 * 
 * @returns Array de herramientas MCP
 */
export async function listTools(): Promise<Tool[]> {
  return [
    ...casosTools,
    ...trabajadoresTools,
    ...examenesTools,
    ...storageTools,
    ...analyticsTools,
    ...empresasTools,
  ];
}

/**
 * Maneja la ejecución de una herramienta
 * 
 * @param toolName - Nombre de la herramienta a ejecutar
 * @param args - Argumentos para la herramienta
 * @param supabase - Cliente de Supabase
 * @returns Resultado de la ejecución de la herramienta
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, any>,
  supabase: SupabaseClient
): Promise<any> {
  // Determinar qué herramienta ejecutar basándose en el nombre
  if (toolName.startsWith('casos_')) {
    return await handleCasosTool(toolName, args, supabase);
  }
  
  if (toolName.startsWith('trabajadores_')) {
    return await handleTrabajadoresTool(toolName, args, supabase);
  }
  
  if (toolName.startsWith('examenes_')) {
    return await handleExamenesTool(toolName, args, supabase);
  }
  
  if (toolName.startsWith('storage_')) {
    return await handleStorageTool(toolName, args, supabase);
  }
  
  if (toolName.startsWith('analytics_')) {
    return await handleAnalyticsTool(toolName, args, supabase);
  }
  
  if (toolName.startsWith('empresas_')) {
    return await handleEmpresasTool(toolName, args, supabase);
  }

  throw new Error(`Herramienta desconocida: ${toolName}`);
}

