/**
 * React Query Configuration
 * 
 * Configuración de TanStack Query (React Query) para caché de consultas
 * 
 * @module lib/react-query
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface ReactQueryProviderProps {
  children: ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // Crear QueryClient con configuración optimizada
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tiempo de caché: 5 minutos
            staleTime: 1000 * 60 * 5,
            // Tiempo de caché en background: 10 minutos
            gcTime: 1000 * 60 * 10, // Anteriormente cacheTime
            // Reintentar automáticamente en caso de error (con exponential backoff)
            retry: (failureCount, error) => {
              // No reintentar en errores 4xx (client errors)
              if (error instanceof Error) {
                const errorMessage = error.message.toLowerCase();
                if (errorMessage.includes('400') || 
                    errorMessage.includes('401') || 
                    errorMessage.includes('403') || 
                    errorMessage.includes('404')) {
                  return false;
                }
              }
              // Reintentar hasta 3 veces
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
            // No refetch automático al enfocar la ventana (mejor para UX)
            refetchOnWindowFocus: false,
            // Refetch automático al reconectar (para datos críticos)
            refetchOnReconnect: true,
            // OPTIMIZACIÓN: Cambiar a false para evitar refetch innecesario
            // Los datos ya están en caché y son válidos por staleTime
            refetchOnMount: false,
          },
          mutations: {
            // Reintentar mutaciones en caso de error
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}


