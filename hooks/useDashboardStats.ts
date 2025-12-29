/**
 * Hook personalizado para estadísticas del Dashboard con React Query
 * 
 * Cachea las estadísticas del dashboard para evitar consultas duplicadas
 * 
 * @module hooks/useDashboardStats
 */

import { useSupabaseQuery } from './useSupabaseQuery';
import { useCompany } from '../contexts/CompanyContext';

interface DashboardStats {
  casosActivos: number;
  casosTotal: number;
  trabajadores: number;
  emosPendientes: number;
}

/**
 * Hook para obtener estadísticas del dashboard con caché
 */
export function useDashboardStats() {
  const { empresaActiva } = useCompany();

  return useSupabaseQuery<DashboardStats>({
    queryKey: ['dashboard-stats', empresaActiva?.id || 'all'],
    queryFn: async (supabaseClient) => {
      // Consultas paralelas para mejor rendimiento
      const [casosResult, trabajadoresResult] = await Promise.all([
        // Consulta de casos
        (async () => {
          try {
            let casosQuery = supabaseClient
              .from('casos')
              .select('id, status', { count: 'exact', head: false });
            
            if (empresaActiva?.id) {
              casosQuery = casosQuery.eq('empresa_id', empresaActiva.id);
            }
            
            const { data, count } = await casosQuery;
            
            if (data && count !== null) {
              return {
                total: count,
                activos: data.filter((c: any) => c.status === 'ACTIVO').length,
              };
            }
            
            // Fallback: usar registros_trabajadores como casos
            let trabajadoresQuery = supabaseClient
              .from('registros_trabajadores')
              .select('id', { count: 'exact', head: false });
            
            if (empresaActiva?.id) {
              trabajadoresQuery = trabajadoresQuery.eq('empresa_id', empresaActiva.id);
            }
            
            const { count: trabajadoresCount } = await trabajadoresQuery;
            
            return {
              total: trabajadoresCount || 0,
              activos: trabajadoresCount || 0,
            };
          } catch (error) {
            return { total: 0, activos: 0 };
          }
        })(),
        
        // Consulta de trabajadores
        (async () => {
          try {
            let trabajadoresQuery = supabaseClient
              .from('registros_trabajadores')
              .select('id', { count: 'exact', head: false });
            
            if (empresaActiva?.id) {
              trabajadoresQuery = trabajadoresQuery.eq('empresa_id', empresaActiva.id);
            }
            
            const { count } = await trabajadoresQuery;
            return count || 0;
          } catch (error) {
            return 0;
          }
        })(),
      ]);

      return {
        casosActivos: casosResult.activos,
        casosTotal: casosResult.total,
        trabajadores: trabajadoresResult,
        emosPendientes: 0, // TODO: Implementar cuando haya tabla de EMOs pendientes
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutos (estadísticas cambian frecuentemente)
    gcTime: 1000 * 60 * 5, // 5 minutos
  });
}


