/**
 * Servicio de Supabase para el servidor MCP
 * 
 * Inicializa y configura el cliente de Supabase
 * 
 * @module mcp-server/src/services/supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Inicializa el cliente de Supabase
 * 
 * @returns Cliente de Supabase configurado
 */
export function initSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurada en las variables de entorno');
  }

  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

