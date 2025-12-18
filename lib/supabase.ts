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

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL o Anon Key no están configuradas en las variables de entorno');
}

/**
 * Cliente de Supabase exportado para uso en toda la aplicación
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


