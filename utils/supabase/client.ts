/**
 * Cliente de Supabase para el navegador (Browser)
 * 
 * Usa createBrowserClient de @supabase/ssr para gestionar correctamente
 * las cookies en el lado del cliente. Esto es necesario para que las
 * cookies se guarden correctamente en el navegador y el middleware
 * pueda leerlas en el servidor.
 * 
 * @module utils/supabase/client
 */

import { createBrowserClient } from '@supabase/ssr';

/**
 * Crea un cliente de Supabase para usar en componentes del cliente
 * 
 * Este cliente:
 * - Gestiona las cookies automáticamente en el navegador
 * - Sincroniza con el middleware del servidor
 * - Permite que las cookies persistan entre recargas
 * 
 * @returns Cliente de Supabase configurado para el navegador
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}



