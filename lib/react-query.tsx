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
            // Reintentar automáticamente en caso de error
            retry: 1,
            // No refetch automático al enfocar la ventana (mejor para UX)
            refetchOnWindowFocus: false,
            // No refetch automático al reconectar (mejor para UX)
            refetchOnReconnect: false,
            // Refetch automático al montar (útil para datos frescos)
            refetchOnMount: true,
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


