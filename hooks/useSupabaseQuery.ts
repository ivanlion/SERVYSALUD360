/**
 * Hook personalizado para consultas Supabase con React Query
 * 
 * Proporciona caché automático y sincronización para consultas a Supabase
 * 
 * @module hooks/useSupabaseQuery
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface SupabaseQueryOptions<TData = any> {
  queryKey: string[];
  queryFn: (client: SupabaseClient) => Promise<TData>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Hook personalizado para consultas Supabase con React Query
 */
export function useSupabaseQuery<TData = any>(
  options: SupabaseQueryOptions<TData>
): UseQueryResult<TData, Error> {
  const {
    queryKey,
    queryFn,
    enabled = true,
    staleTime = 1000 * 60 * 5, // 5 minutos por defecto
    gcTime = 1000 * 60 * 10, // 10 minutos por defecto
  } = options;

  return useQuery<TData, Error>({
    queryKey,
    queryFn: async () => {
      try {
        return await queryFn(supabase);
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error('Error en consulta Supabase'), {
          context: 'useSupabaseQuery',
          queryKey: queryKey.join('/'),
        });
        throw error;
      }
    },
    enabled,
    staleTime,
    gcTime,
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
      // Reintentar hasta 3 veces con exponential backoff
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff: 1s, 2s, 4s, max 30s
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Cambiado a true para datos críticos
  });
}


