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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validación estricta de variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 
    '❌ Variables de entorno de Supabase no configuradas.\n' +
    'Asegúrate de configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local';
  
  if (typeof window === 'undefined') {
    // En el servidor, lanzar error inmediatamente
    throw new Error(errorMessage);
  } else {
    // En el cliente, mostrar error visible
    console.error(errorMessage);
    throw new Error('Configuración de Supabase faltante. Ver consola para más detalles.');
  }
}

// Validar formato de URL de Supabase
if (!supabaseUrl.startsWith('https://')) {
  throw new Error('❌ La URL de Supabase debe comenzar con https://');
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


