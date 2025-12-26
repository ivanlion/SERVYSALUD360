/**
 * Helper para crear cliente de Supabase en Server Actions
 * Maneja las cookies correctamente para autenticación
 * 
 * @module lib/supabase-server
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Crea un cliente de Supabase que puede leer las cookies de la sesión
 * Útil para Server Actions que necesitan verificar la identidad del usuario
 * 
 * @returns Cliente de Supabase configurado con cookies
 */
export async function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variables de entorno de Supabase no configuradas');
  }

  const cookieStore = await cookies();

  // Crear cliente con configuración para leer cookies
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // Pasar todas las cookies al cliente
        Cookie: cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; '),
      },
    },
  });

  return supabase;
}

/**
 * Crea un cliente de Supabase con Service Role Key
 * Útil para operaciones administrativas que requieren permisos elevados
 * 
 * @returns Cliente de Supabase con Service Role Key
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Variables de entorno de Supabase (Service Role Key) no configuradas');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

