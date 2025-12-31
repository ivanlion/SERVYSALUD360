/**
 * Hook personalizado para casos de trabajo modificado con React Query
 * 
 * Cachea los casos de trabajo modificado con paginación
 * 
 * @module hooks/useWorkModifiedCases
 */

import { useSupabaseQuery } from './useSupabaseQuery';
import { useCompany } from '../contexts/CompanyContext';
import { CaseData, INITIAL_CASE, EventType } from '../types';
import { validateSupabaseArray, TrabajadorSchema } from '../lib/validations/supabase-schemas';
import { logger } from '../utils/logger';

interface SupabaseRecord {
  id: number | string;
  fecha_registro?: string;
  apellidos_nombre?: string;
  dni_ce_pas?: string;
  telefono_trabajador?: string;
  sexo?: string;
  jornada_laboral?: string;
  puesto_trabajo?: string;
  empresa?: string;
  gerencia?: string;
  supervisor_responsable?: string;
  telf_contacto_supervisor?: string;
  empresa_id?: string;
}

interface CaseDataWithSupabaseId extends CaseData {
  supabaseId?: number | string;
}

interface WorkModifiedCasesResult {
  cases: CaseDataWithSupabaseId[];
  totalCount: number;
}

/**
 * Mapea los datos de Supabase al formato CaseData de la aplicación
 */
function mapSupabaseToCaseData(record: SupabaseRecord, index: number): CaseDataWithSupabaseId {
  return {
    ...INITIAL_CASE,
    id: `PO-0006-${String(index + 1).padStart(3, '0')}`,
    supabaseId: record.id,
    fecha: record.fecha_registro || '',
    trabajadorNombre: record.apellidos_nombre || '',
    dni: record.dni_ce_pas || '',
    telfContacto: record.telefono_trabajador || '',
    sexo: (record.sexo === 'Masculino' || record.sexo === 'Femenino' ? record.sexo : '') as '' | 'Masculino' | 'Femenino',
    jornadaLaboral: record.jornada_laboral || '',
    puesto: record.puesto_trabajo || '',
    empresa: record.empresa || '',
    gerencia: record.gerencia || '',
    supervisor: record.supervisor_responsable || '',
    supervisorTelf: record.telf_contacto_supervisor || '',
    tipoEvento: EventType.ACCIDENTE_TRABAJO,
    assessment: { ...INITIAL_CASE.assessment },
    assessment2: { ...INITIAL_CASE.assessment },
    tareasRealizar: '',
    areaLugar: '',
    tareasPrincipales: '',
    comentariosSupervisor: '',
    reevaluaciones: []
  };
}

/**
 * Hook para obtener casos de trabajo modificado con caché y paginación
 */
export function useWorkModifiedCases(currentPage: number = 1, pageSize: number = 100) {
  const { empresaActiva } = useCompany();

  return useSupabaseQuery<WorkModifiedCasesResult>({
    queryKey: ['work-modified-cases', empresaActiva?.id || 'all', currentPage.toString(), pageSize.toString()],
    queryFn: async (supabaseClient) => {
      const offset = (currentPage - 1) * pageSize;
      
      // OPTIMIZACIÓN: Solo campos necesarios para la vista del dashboard
      // Removido count: 'exact' del select principal, se obtiene por separado si es necesario
      let query = supabaseClient
        .from('registros_trabajadores')
        .select('id, fecha_registro, apellidos_nombre, dni_ce_pas, telefono_trabajador, sexo, jornada_laboral, puesto_trabajo, empresa, gerencia, supervisor_responsable, telf_contacto_supervisor, empresa_id', { count: 'exact' })
        .order('fecha_registro', { ascending: false })
        .range(offset, offset + pageSize - 1);
      
      // NOTA: count: 'exact' se mantiene aquí porque es necesario para la paginación
      // pero solo se calcula una vez, no se transfiere con cada fila
      
      // Filtrar por empresa activa si está disponible (multi-tenancy)
      if (empresaActiva?.id) {
        query = query.eq('empresa_id', empresaActiva.id);
      }
      
      const { data, error: supabaseError, count } = await query;
      
      if (supabaseError) {
        throw supabaseError;
      }

      if (!data) {
        return {
          cases: [],
          totalCount: 0,
        };
      }

      // Validar datos con Zod antes de procesarlos
      try {
        const validatedData = validateSupabaseArray(TrabajadorSchema, data, 'registros_trabajadores');
        const mappedCases = validatedData.map((record: any, index: number) =>
          mapSupabaseToCaseData(record as SupabaseRecord, index)
        );
        
        return {
          cases: mappedCases,
          totalCount: count || 0,
        };
      } catch (validationError: any) {
        logger.error(validationError instanceof Error ? validationError : new Error('Error de validación'), {
          context: 'useWorkModifiedCases',
          dataCount: data.length
        });
        
        // Nota: Las notificaciones se manejan en el componente que usa el hook
        // para evitar dependencias circulares y mantener el hook puro
        
        // Continuar con datos sin validar como fallback (pero loguear el error)
        const mappedCases = data.map((record: any, index: number) =>
          mapSupabaseToCaseData(record as SupabaseRecord, index)
        );
        
        return {
          cases: mappedCases,
          totalCount: count || 0,
        };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos (ajustado para mejor rendimiento)
    gcTime: 1000 * 60 * 15, // 15 minutos en caché
  });
}


