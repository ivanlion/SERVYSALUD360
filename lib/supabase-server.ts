/**
 * Helper para crear cliente de Supabase en Server Actions
 * Maneja las cookies correctamente para autenticación usando @supabase/ssr
 * 
 * @module lib/supabase-server
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Crea un cliente de Supabase que puede leer las cookies de la sesión
 * Útil para Server Actions que necesitan verificar la identidad del usuario
 * 
 * Usa @supabase/ssr para manejar las cookies correctamente en Server Actions
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

  // Crear cliente usando @supabase/ssr para manejar cookies correctamente
  const supabase = createSupabaseServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // En Server Actions, no podemos escribir cookies directamente
          // pero podemos leerlas para verificar la sesión
          // El middleware se encarga de actualizar las cookies
          cookiesToSet.forEach(({ name, value }) => {
            // Solo log para debugging, no podemos escribir en Server Actions
            console.log(`[createServerClient] Cookie que se intentaría establecer: ${name}`);
          });
        },
      },
    }
  );

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

