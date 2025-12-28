/**
 * Helper para el middleware de Supabase SSR
 * 
 * Gestiona la actualización de sesiones y cookies en el middleware de Next.js
 * 
 * @module utils/supabase/middleware
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Actualiza la sesión de Supabase en cada request
 * 
 * Esta función:
 * 1. Copia las cookies del request al cliente de Supabase
 * 2. Refresca el token con supabase.auth.getUser()
 * 3. Escribe las cookies nuevas/refrescadas tanto en el request como en el response
 * 
 * @param request - Request de Next.js
 * @returns Response con cookies actualizadas
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Lee las cookies del request
         */
        getAll() {
          return request.cookies.getAll();
        },
        /**
         * Escribe las cookies tanto en el request como en el response
         * Esto es CRUCIAL para que las cookies persistan
         */
        setAll(cookiesToSet) {
          // 1. Escribir cookies en el request (para que estén disponibles en el mismo request)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          
          // 2. Crear nueva respuesta con las cookies actualizadas
          supabaseResponse = NextResponse.next({
            request,
          });
          
          // 3. Escribir cookies en el response (para que persistan en el navegador)
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // CRUCIAL: Ejecutar getUser() para refrescar la sesión
  // Esto actualiza las cookies si el token necesita ser renovado
  // y asegura que la sesión esté disponible para Server Actions
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Log para debugging (solo en desarrollo y solo para errores no esperados)
  // NO loguear "Auth session missing" ya que es normal cuando el usuario no ha iniciado sesión
  if (error) {
    // Solo loguear errores que NO sean "session missing" (que es esperado cuando no hay sesión)
    const isSessionMissing = error.message?.includes('Auth session missing') || 
                            error.message?.includes('session missing') ||
                            error.message?.includes('JWT expired') ||
                            error.status === 401;
    
    if (!isSessionMissing && process.env.NODE_ENV === 'development') {
      // Solo loguear errores inesperados
      console.warn('⚠️ [middleware] Error al obtener usuario:', error.message);
      console.warn('⚠️ [middleware] Código de error:', error.status);
    }
    // Si es "session missing", no loguear nada (es comportamiento esperado)
  }
  // Tampoco loguear sesiones válidas para reducir ruido (solo si necesitas debug específico)

  // Devolver la respuesta con las cookies actualizadas
  // Esto asegura que las cookies se envíen al navegador y persistan
  return supabaseResponse;
}

