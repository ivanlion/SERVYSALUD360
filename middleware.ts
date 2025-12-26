/**
 * Middleware de Next.js para gestionar la sesión de Supabase
 * 
 * Este middleware se ejecuta en cada request y actualiza las cookies
 * de autenticación de Supabase, permitiendo que las Server Actions
 * puedan leer correctamente la sesión del usuario.
 * 
 * NOTA: Ignorar el aviso de 'proxy' - Supabase requiere el middleware estándar.
 * 
 * @module middleware
 */

import { type NextRequest } from 'next/server';
import { updateSession } from './utils/supabase/middleware';

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

