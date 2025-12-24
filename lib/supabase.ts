/**
 * Cliente de Supabase para la aplicación
 * 
 * Configuración del cliente de Supabase usando las variables de entorno
 * NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 
 * @module lib/supabase
 */

import { createClient } from '@supabase/supabase-js';

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
 * Cliente de Supabase exportado para uso en toda la aplicación
 * 
 * @throws {Error} Si las credenciales no están configuradas correctamente
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No persistir sesión en el cliente
    autoRefreshToken: false,
  },
});


