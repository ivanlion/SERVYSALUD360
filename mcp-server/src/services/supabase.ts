/**
 * Servicio de Supabase para el servidor MCP
 * 
 * Inicializa y configura el cliente de Supabase
 * 
 * @module mcp-server/src/services/supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ✅ OPTIMIZACIÓN: Singleton para reutilizar el cliente entre requests
let supabaseClient: SupabaseClient | null = null;
let clientInitialized = false;

/**
 * Inicializa el cliente de Supabase (función interna)
 * 
 * @returns Cliente de Supabase configurado
 */
function initSupabaseClient(): SupabaseClient {
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

/**
 * Obtiene el cliente de Supabase (singleton)
 * 
 * Reutiliza el cliente si ya existe, sino lo crea.
 * Esto mejora el rendimiento al evitar crear múltiples conexiones.
 * 
 * @returns Cliente de Supabase configurado
 */
export function getSupabaseClient(): SupabaseClient {
  if (!clientInitialized || !supabaseClient) {
    supabaseClient = initSupabaseClient();
    clientInitialized = true;
  }
  return supabaseClient;
}

/**
 * Resetea el cliente de Supabase (útil para testing o reconfiguración)
 * 
 * @internal
 */
export function resetSupabaseClient(): void {
  supabaseClient = null;
  clientInitialized = false;
}

