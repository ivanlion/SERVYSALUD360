/**
 * AuthGuard - Componente de protección de rutas
 * 
 * Verifica la autenticación del usuario y redirige al login si no está autenticado
 * 
 * @component
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkAuth = async () => {
      try {
        // Timeout configurable (por defecto 10 segundos)
        const AUTH_TIMEOUT = process.env.NEXT_PUBLIC_AUTH_TIMEOUT 
          ? parseInt(process.env.NEXT_PUBLIC_AUTH_TIMEOUT, 10) 
          : 10000;
        
        // Timeout para evitar que se quede colgado
        timeoutId = setTimeout(() => {
          if (isMounted) {
            logger.warn('[AuthGuard] Timeout: La verificación tardó más de 10 segundos, usando fallback');
            // Intentar con getUser como fallback
            supabase.auth.getUser().then(({ data: { user }, error: userError }) => {
              if (!isMounted) return;
              if (userError || !user) {
                router.push('/login');
              } else {
                setIsAuthenticated(true);
              }
              setIsLoading(false);
            }).catch(() => {
              if (isMounted) {
                router.push('/login');
                setIsLoading(false);
              }
            });
          }
        }, AUTH_TIMEOUT);

        // OPTIMIZACIÓN: Intentar obtener la sesión (más rápido que getUser)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (error) {
          logger.error(error instanceof Error ? error : new Error('Error al obtener sesión'), {
            context: 'AuthGuard'
          });
          setIsLoading(false);
          router.push('/login');
          return;
        }
        
        if (session) {
          setIsAuthenticated(true);
        } else {
          // Si no hay sesión, intentar con getUser como fallback
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              setIsAuthenticated(true);
            } else {
              router.push('/login');
            }
          } catch (userError) {
            logger.error(userError instanceof Error ? userError : new Error('Error al obtener usuario'), {
              context: 'AuthGuard'
            });
            router.push('/login');
          }
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        logger.error(error instanceof Error ? error : new Error('Error al verificar autenticación'), {
          context: 'AuthGuard'
        });
        
        if (!isMounted) return;

        // Si es timeout, intentar una vez más con getUser
        if (error?.message?.includes('Timeout')) {
          logger.debug('[AuthGuard] Timeout detectado, intentando con getUser...');
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && isMounted) {
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          } catch (fallbackError) {
            logger.error(fallbackError instanceof Error ? fallbackError : new Error('Error en fallback'), {
              context: 'AuthGuard'
            });
          }
        }
        
        if (isMounted) {
          router.push('/login');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (session) {
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
        router.push('/login');
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-lg font-semibold text-slate-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}



