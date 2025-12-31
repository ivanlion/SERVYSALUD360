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
      // OPTIMIZACIÓN: Consultas paralelas usando head:true para solo obtener counts
      // Esto reduce drásticamente la transferencia de datos (solo metadata, no filas)
      const [casosResult, trabajadoresResult] = await Promise.all([
        // Consulta de casos - OPTIMIZADA: dos consultas separadas para total y activos
        (async () => {
          try {
            // Consulta 1: Total de casos (solo count, sin datos)
            let casosTotalQuery = supabaseClient
              .from('casos')
              .select('*', { count: 'exact', head: true });
            
            if (empresaActiva?.id) {
              casosTotalQuery = casosTotalQuery.eq('empresa_id', empresaActiva.id);
            }
            
            const { count: totalCount } = await casosTotalQuery;
            
            // Consulta 2: Solo casos activos (solo count, sin datos)
            let casosActivosQuery = supabaseClient
              .from('casos')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'ACTIVO');
            
            if (empresaActiva?.id) {
              casosActivosQuery = casosActivosQuery.eq('empresa_id', empresaActiva.id);
            }
            
            const { count: activosCount } = await casosActivosQuery;
            
            if (totalCount !== null) {
              return {
                total: totalCount,
                activos: activosCount || 0,
              };
            }
            
            // Fallback: usar registros_trabajadores como casos (solo count)
            let trabajadoresQuery = supabaseClient
              .from('registros_trabajadores')
              .select('*', { count: 'exact', head: true });
            
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
        
        // Consulta de trabajadores - OPTIMIZADA: solo count, sin datos
        (async () => {
          try {
            let trabajadoresQuery = supabaseClient
              .from('registros_trabajadores')
              .select('*', { count: 'exact', head: true });
            
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


