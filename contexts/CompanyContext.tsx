/**
 * CompanyContext - Contexto para gestión de empresas (Multi-tenancy)
 * 
 * Permite que cada usuario tenga múltiples empresas y seleccione una activa
 * 
 * @module contexts/CompanyContext
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { validateSupabaseArray, EmpresaSchema } from '../lib/validations/supabase-schemas';

export interface Empresa {
  id: string;
  nombre: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  nombreComercial?: string;
  actividadesEconomicas?: string;
  activa: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CompanyContextType {
  empresas: Empresa[];
  empresaActiva: Empresa | null;
  isLoading: boolean;
  setEmpresaActiva: (empresa: Empresa | null) => void;
  refreshEmpresas: () => Promise<void>;
  addEmpresa: (empresa: Omit<Empresa, 'id' | 'created_at' | 'updated_at'>) => Promise<Empresa | null>;
  updateEmpresa: (id: string, empresa: Partial<Empresa>) => Promise<boolean>;
  deleteEmpresa: (id: string) => Promise<boolean>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaActiva, setEmpresaActivaState] = useState<Empresa | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Hook seguro para localStorage (solo para escribir)
  const [, setEmpresaActivaIdStorage] = useLocalStorage<string | null>('empresa_activa_id', null);

  // Helper seguro para leer localStorage
  const getEmpresaActivaId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem('empresa_activa_id');
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error('Error al leer localStorage'), { context: 'getEmpresaActivaId' });
      return null;
    }
  }, []);

  // Cargar empresas del usuario actual
  // RLS automáticamente filtra solo las empresas del usuario autenticado
  const loadEmpresas = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.debug('[loadEmpresas] Iniciando carga de empresas...');
      
      // Verificar autenticación con timeout (usar getSession primero, más rápido)
      let user: any = null;
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (session?.user) {
          user = session.user;
          logger.debug('[loadEmpresas] Usuario obtenido de sesión:', user.id);
        } else {
          logger.warn('[loadEmpresas] No hay sesión, intentando getUser con timeout...');
          // Fallback a getUser con timeout corto
          try {
            const authPromise = supabase.auth.getUser();
            const authTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 3000)
            );
            const result = await Promise.race([authPromise, authTimeout]) as any;
            if (result?.data?.user) {
              user = result.data.user;
              logger.debug('[loadEmpresas] Usuario obtenido de getUser:', user.id);
            }
          } catch (getUserErr: any) {
            logger.warn('[loadEmpresas] No se pudo obtener usuario:', getUserErr.message);
            // Continuar de todas formas, RLS validará permisos
          }
        }
      } catch (authErr: any) {
        logger.warn('[loadEmpresas] Error en verificación de autenticación:', authErr.message);
        // Continuar de todas formas, RLS validará permisos
      }

      if (!user) {
        logger.warn('[loadEmpresas] No hay usuario autenticado, pero continuando (RLS validará)');
        setEmpresas([]);
        setEmpresaActivaState(null);
        setIsLoading(false);
        return;
      }

      logger.debug('[loadEmpresas] Consultando empresas desde Supabase...');
      // Consulta directa a empresas - RLS filtra automáticamente
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas')
        .select('*', { count: 'exact' })
        .order('nombre', { ascending: true })
        .limit(100);

      if (empresasError) {
        logger.error(new Error(empresasError.message), {
          context: 'loadEmpresas',
          details: empresasError.details,
          hint: empresasError.hint,
          code: empresasError.code,
          fullError: JSON.stringify(empresasError, null, 2)
        });
        setEmpresas([]);
        setEmpresaActivaState(null);
        setIsLoading(false);
        return;
      }

      // Asegurar que empresasData sea un array válido
      const empresasArray = Array.isArray(empresasData) ? empresasData : [];

      // Función helper para mapear campos de snake_case a camelCase
      const mapRpcResponseToEmpresa = (emp: any): Empresa => ({
        id: emp.id,
        nombre: emp.nombre,
        ruc: emp.ruc,
        direccion: emp.direccion,
        telefono: emp.telefono,
        email: emp.email,
        nombreComercial: emp.nombre_comercial,
        actividadesEconomicas: emp.actividades_economicas,
        activa: emp.activa,
        created_at: emp.created_at,
        updated_at: emp.updated_at,
      });

      // Validar datos con Zod antes de procesarlos
      let empresas: Empresa[] = [];
      try {
        // Normalizar fechas antes de validar (convertir Date a string si es necesario)
        const normalizedData = empresasArray.map((emp: any) => ({
          ...emp,
          created_at: emp.created_at instanceof Date 
            ? emp.created_at.toISOString() 
            : emp.created_at,
          updated_at: emp.updated_at instanceof Date 
            ? emp.updated_at.toISOString() 
            : emp.updated_at,
        }));
        
        const validatedData = validateSupabaseArray(EmpresaSchema, normalizedData, 'empresas');
        empresas = validatedData.map(mapRpcResponseToEmpresa);
      } catch (validationError: any) {
        logger.error(validationError instanceof Error ? validationError : new Error('Error de validación empresas'), {
          context: 'loadEmpresas',
          dataCount: empresasArray.length,
          errorMessage: validationError?.message
        });
        // Continuar con datos sin validar como fallback (pero loguear el error)
        empresas = empresasArray.map(mapRpcResponseToEmpresa);
      }
      logger.debug('[loadEmpresas] Empresas cargadas:', empresas.length);
      setEmpresas(empresas);

      // Cargar empresa activa desde localStorage (usando helper seguro)
      const empresaActivaId = getEmpresaActivaId();
      if (empresaActivaId) {
        const empresa = empresas.find(e => e.id === empresaActivaId);
        if (empresa) {
          setEmpresaActivaState(empresa);
          logger.debug('[loadEmpresas] Empresa activa restaurada:', empresa.nombre);
        } else if (empresas.length > 0) {
          // Si la empresa guardada no existe, usar la primera
          setEmpresaActivaState(empresas[0]);
          setEmpresaActivaIdStorage(empresas[0].id);
          logger.debug('[loadEmpresas] Empresa activa cambiada a primera disponible:', empresas[0].nombre);
        }
      } else if (empresas.length > 0) {
        // Si no hay empresa guardada, usar la primera
        setEmpresaActivaState(empresas[0]);
        setEmpresaActivaIdStorage(empresas[0].id);
        logger.debug('[loadEmpresas] Empresa activa establecida (primera):', empresas[0].nombre);
      } else {
        logger.debug('[loadEmpresas] No hay empresas disponibles');
      }

    } catch (error: any) {
      logger.error(error instanceof Error ? error : new Error(error?.message || 'Error desconocido'), {
        context: 'loadEmpresas',
        stack: error?.stack,
        name: error?.name,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      });
      setEmpresas([]);
      setEmpresaActivaState(null);
    } finally {
      setIsLoading(false);
      logger.debug('[loadEmpresas] Carga completada');
    }
  }, [getEmpresaActivaId]);

  // Cargar empresas al montar
  useEffect(() => {
    loadEmpresas();

    // Escuchar cambios en autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadEmpresas();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadEmpresas]);

  // Función para cambiar empresa activa
  const setEmpresaActiva = (empresa: Empresa | null) => {
    setEmpresaActivaState(empresa);
    setEmpresaActivaIdStorage(empresa?.id || null);
  };

  // Refrescar empresas
  const refreshEmpresas = async () => {
    await loadEmpresas();
  };

  // Agregar nueva empresa
  const addEmpresa = async (empresaData: Omit<Empresa, 'id' | 'created_at' | 'updated_at'>): Promise<Empresa | null> => {
    try {
      // PASO 1: Verificar autenticación del usuario
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // DEBUG: Imprimir usuario actual antes de continuar
      logger.debug('[addEmpresa] DEBUG - Usuario actual:', user);
      logger.debug('[addEmpresa] DEBUG - user.id existe?:', user?.id ? 'SÍ' : 'NO');
      logger.debug('[addEmpresa] DEBUG - user.id valor:', user?.id);
      logger.debug('[addEmpresa] DEBUG - user completo:', JSON.stringify(user, null, 2));
      
      if (userError) {
        const errorInfo = {
          message: userError.message || 'Error desconocido al obtener usuario',
          fullError: JSON.stringify(userError, null, 2)
        };
        logger.error(new Error(userError.message || 'Error desconocido al obtener usuario'), {
          context: 'addEmpresa',
          ...errorInfo
        });
        alert(`Error al obtener usuario: ${userError.message || 'Error desconocido'}`);
        return null;
      }

      if (!user || !user.id) {
        logger.error(new Error('Usuario no autenticado o sin ID'), { context: 'addEmpresa' });
        alert('Error: Usuario no autenticado o sin ID. Por favor, inicia sesión nuevamente.');
        return null;
      }

      logger.debug('[addEmpresa] Paso 1: ✅ Usuario autenticado', {
        user_id: user.id,
        user_email: user.email
      });

      // PASO 2: Preparar datos para la función RPC
      // Validar que nombre sea requerido
      if (!empresaData.nombre || !empresaData.nombre.trim()) {
        const errorMsg = 'El nombre de la empresa es requerido';
        console.error('[addEmpresa] Error de validación:', errorMsg);
        alert(errorMsg);
        return null;
      }

      // Preparar parámetros para la función RPC
      // Orden: nombre, ruc, direccion, email, telefono, nombre_comercial, actividades_economicas
      const rpcParams = {
        p_nombre: empresaData.nombre.trim(),
        p_ruc: empresaData.ruc?.trim() || null,
        p_direccion: empresaData.direccion?.trim() || null,
        p_email: empresaData.email?.trim() || null,
        p_telefono: empresaData.telefono?.trim() || null,
        p_nombre_comercial: empresaData.nombreComercial?.trim() || null,
        p_actividades_economicas: empresaData.actividadesEconomicas?.trim() || null,
      };

      // DEBUG: Imprimir datos que se enviarán a la RPC
      logger.debug('[addEmpresa] DEBUG - Datos originales recibidos:', JSON.stringify(empresaData, null, 2));
      logger.debug('[addEmpresa] DEBUG - Parámetros para RPC:', JSON.stringify(rpcParams, null, 2));

      // PASO 3: Llamar a la función RPC 'crear_empresa_completa'
      logger.debug('[addEmpresa] Paso 2: Llamando a función RPC crear_empresa_completa...', {
        nombre: rpcParams.p_nombre,
        ruc: rpcParams.p_ruc || 'N/A',
        direccion: rpcParams.p_direccion || 'N/A',
        email: rpcParams.p_email || 'N/A',
        telefono: rpcParams.p_telefono || 'N/A'
      });

      const { data: empresa, error: rpcError } = await supabase.rpc('crear_empresa_completa', rpcParams);

      // DEBUG: Capturar y mostrar error explícitamente
      if (rpcError) {
        const errorInfo = {
          message: rpcError.message || 'Error desconocido al crear empresa',
          details: rpcError.details || null,
          hint: rpcError.hint || null,
          code: rpcError.code || null,
          fullError: JSON.stringify(rpcError, null, 2)
        };
        
        logger.error(new Error(rpcError.message || 'Error desconocido al crear empresa'), {
          context: 'addEmpresa',
          ...errorInfo
        });
        
        // Mostrar alerta con detalles técnicos
        const alertMessage = `Error al crear empresa:\n\n` +
          `Mensaje: ${rpcError.message || 'Error desconocido'}\n` +
          `Detalles: ${rpcError.details || 'N/A'}\n` +
          `Hint: ${rpcError.hint || 'N/A'}\n` +
          `Código: ${rpcError.code || 'N/A'}\n\n` +
          `Revisa la consola para más información.`;
        
        alert(alertMessage);
        return null;
      }

      // DEBUG: Verificar respuesta de la RPC
      logger.debug('[addEmpresa] DEBUG - Respuesta de RPC (empresa):', empresa);
      logger.debug('[addEmpresa] DEBUG - empresa existe?:', empresa ? 'SÍ' : 'NO');
      logger.debug('[addEmpresa] DEBUG - empresa.id existe?:', empresa?.id ? 'SÍ' : 'NO');
      logger.debug('[addEmpresa] DEBUG - empresa.id valor:', empresa?.id);

      if (!empresa || !empresa.id) {
        const errorMsg = `La función RPC no retornó una empresa válida.\n\nRespuesta recibida: ${JSON.stringify(empresa, null, 2)}`;
        logger.error(new Error(errorMsg), { context: 'addEmpresa' });
        alert(errorMsg);
        return null;
      }

      // Mapear campos de snake_case a camelCase
      const empresaMapeada: Empresa = {
        id: empresa.id,
        nombre: empresa.nombre,
        ruc: empresa.ruc,
        direccion: empresa.direccion,
        telefono: empresa.telefono,
        email: empresa.email,
        nombreComercial: (empresa as any).nombre_comercial,
        actividadesEconomicas: (empresa as any).actividades_economicas,
        activa: empresa.activa,
        created_at: empresa.created_at,
        updated_at: empresa.updated_at,
      };

      logger.debug('[addEmpresa] Paso 2: ✅ Empresa creada exitosamente mediante RPC', {
        empresa_id: empresaMapeada.id,
        nombre: empresaMapeada.nombre
      });

      // Nota: La función RPC 'crear_empresa_completa' ya crea la empresa y la asocia al usuario
      // No necesitamos hacer inserts manuales en 'empresas' ni 'user_empresas'

      // PASO 4: Actualizar UI inmediatamente - Recargar lista de empresas
      logger.debug('[addEmpresa] Paso 4: Actualizando UI...');
      
      // Establecer como activa ANTES de refrescar para feedback inmediato
      setEmpresaActiva(empresaMapeada);
      
      // Agregar empresa a la lista local inmediatamente (optimistic update)
      setEmpresas(prevEmpresas => {
        const nuevasEmpresas = [...prevEmpresas, empresaMapeada].sort((a, b) => 
          a.nombre.localeCompare(b.nombre)
        );
        return nuevasEmpresas;
      });

      // Refrescar desde el servidor para asegurar sincronización
      await refreshEmpresas();
      
      logger.debug('[addEmpresa] Paso 4: ✅ UI actualizada - Empresa visible en la lista');

      return empresaMapeada;
    } catch (error: any) {
      // Manejo de errores inesperados
      logger.error(error instanceof Error ? error : new Error(error?.message || 'Error desconocido'), {
        context: 'addEmpresa',
        stack: error?.stack,
        name: error?.name,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      });
      return null;
    }
  };

  // Actualizar empresa
  const updateEmpresa = async (id: string, empresaData: Partial<Empresa>): Promise<boolean> => {
    try {
      // Mapear campos de camelCase a snake_case para Supabase
      const updateData: any = {};
      if (empresaData.nombre !== undefined) updateData.nombre = empresaData.nombre;
      if (empresaData.ruc !== undefined) updateData.ruc = empresaData.ruc;
      if (empresaData.direccion !== undefined) updateData.direccion = empresaData.direccion;
      if (empresaData.telefono !== undefined) updateData.telefono = empresaData.telefono;
      if (empresaData.email !== undefined) updateData.email = empresaData.email;
      if (empresaData.nombreComercial !== undefined) updateData.nombre_comercial = empresaData.nombreComercial;
      if (empresaData.actividadesEconomicas !== undefined) updateData.actividades_economicas = empresaData.actividadesEconomicas;
      
      const { error } = await supabase
        .from('empresas')
        .update(updateData)
        .eq('id', id);

      if (error) {
        logger.error(new Error(error.message), {
          context: 'updateEmpresa',
          details: error.details,
          hint: error.hint,
          code: error.code,
          empresa_id: id,
          fullError: JSON.stringify(error, null, 2)
        });
        return false;
      }

      await refreshEmpresas();
      return true;
    } catch (error: any) {
      logger.error(error instanceof Error ? error : new Error(error?.message || 'Error desconocido'), {
        context: 'updateEmpresa',
        stack: error?.stack,
        name: error?.name,
        empresa_id: id,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      });
      return false;
    }
  };

  // Eliminar empresa
  const deleteEmpresa = async (id: string): Promise<boolean> => {
    try {
      // Eliminar relación usuario-empresa
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_empresas')
          .delete()
          .eq('user_id', user.id)
          .eq('empresa_id', id);
      }

      // Eliminar empresa
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error(new Error(error.message), {
          context: 'deleteEmpresa',
          details: error.details,
          hint: error.hint,
          code: error.code,
          empresa_id: id,
          fullError: JSON.stringify(error, null, 2)
        });
        return false;
      }

      // Si era la empresa activa, cambiar a otra
      if (empresaActiva?.id === id) {
        const nuevasEmpresas = empresas.filter(e => e.id !== id);
        if (nuevasEmpresas.length > 0) {
          setEmpresaActiva(nuevasEmpresas[0]);
        } else {
          setEmpresaActiva(null);
        }
      }

      await refreshEmpresas();
      return true;
    } catch (error: any) {
      logger.error(error instanceof Error ? error : new Error(error?.message || 'Error desconocido'), {
        context: 'deleteEmpresa',
        stack: error?.stack,
        name: error?.name,
        empresa_id: id,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      });
      return false;
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        empresas,
        empresaActiva,
        isLoading,
        setEmpresaActiva,
        refreshEmpresas,
        addEmpresa,
        updateEmpresa,
        deleteEmpresa,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

