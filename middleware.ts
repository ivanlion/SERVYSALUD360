/**
 * Middleware de Next.js para gestionar la sesión de Supabase
 * 
 * Este middleware se ejecuta en cada request y actualiza las cookies
 * de autenticación de Supabase, permitiendo que las Server Actions
 * puedan leer correctamente la sesión del usuario.
 * 
 * @module middleware
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Actualiza la sesión de Supabase en cada request
 * 
 * Crea un cliente de Supabase que lee y escribe cookies,
 * ejecuta getUser() para refrescar la sesión si es necesario,
 * y devuelve la respuesta con las cookies actualizadas.
 * 
 * @param request - Request de Next.js
 * @returns Response con cookies actualizadas
 */
async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANTE: Ejecutar getUser() para refrescar la sesión
  // Esto actualiza las cookies si el token necesita ser renovado
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Si hay un error de autenticación, podemos manejarlo aquí
  // Por ahora, simplemente continuamos con la respuesta
  if (error) {
    console.warn('⚠️ [middleware] Error al obtener usuario:', error.message);
  }

  // Devolver la respuesta con las cookies actualizadas
  return supabaseResponse;
}

/**
 * Middleware de Next.js
 * 
 * Se ejecuta en cada request antes de que llegue a las rutas.
 * Actualiza la sesión de Supabase y devuelve la respuesta con
 * las cookies actualizadas.
 * 
 * @param request - Request de Next.js
 * @returns Response con cookies actualizadas
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Configuración del middleware
 * 
 * Define qué rutas deben ejecutar el middleware.
 * Ignora archivos estáticos y recursos públicos para mejorar el rendimiento.
 */
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - archivos públicos (public folder)
     * - archivos de imagen (png, jpg, jpeg, gif, svg, webp)
     * - archivos de fuente (woff, woff2, ttf, eot)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot)$).*)',
  ],
};

