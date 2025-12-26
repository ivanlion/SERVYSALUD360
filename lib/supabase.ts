/**
 * Cliente de Supabase para la aplicación (Browser)
 * 
 * IMPORTANTE: Usa createBrowserClient de @supabase/ssr para gestionar
 * correctamente las cookies en el navegador. Esto es necesario para que
 * las cookies se guarden correctamente y el middleware pueda leerlas.
 * 
 * @module lib/supabase
 */

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validación de variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL o Anon Key no están configuradas en las variables de entorno');
  console.warn('⚠️ Asegúrate de configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local');
}

// Validar formato de URL de Supabase
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.warn('⚠️ La URL de Supabase debe comenzar con https://');
}

/**
 * Cliente de Supabase exportado para uso en componentes del cliente
 * 
 * Usa createBrowserClient de @supabase/ssr para:
 * - Gestionar cookies automáticamente en el navegador
 * - Sincronizar con el middleware del servidor
 * - Permitir que las cookies persistan entre recargas
 * 
 * @throws {Error} Si las credenciales no están configuradas correctamente
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);


