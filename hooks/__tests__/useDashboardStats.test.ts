/**
 * Tests para useDashboardStats.ts
 * 
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardStats } from '../useDashboardStats';
import { useCompany } from '../../contexts/CompanyContext';

// Mock de dependencias
jest.mock('../useSupabaseQuery', () => ({
  useSupabaseQuery: jest.fn(),
}));
jest.mock('../../contexts/CompanyContext');
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    })),
  },
}));

const mockUseCompany = useCompany as jest.MockedFunction<typeof useCompany>;

describe('useDashboardStats', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCompany.mockReturnValue({
      empresaActiva: { id: '1', nombre: 'Empresa Test' },
      empresas: [],
      isLoading: false,
      setEmpresaActiva: jest.fn(),
      refreshEmpresas: jest.fn(),
      addEmpresa: jest.fn(),
      updateEmpresa: jest.fn(),
      deleteEmpresa: jest.fn(),
    });
  });

  test('retorna estadísticas por defecto cuando no hay datos', () => {
    const { useSupabaseQuery } = require('../useSupabaseQuery');
    useSupabaseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    // El hook debería retornar valores por defecto
    expect(result.current.data).toBeDefined();
  });

  test('retorna estadísticas correctas cuando hay datos', () => {
    const { useSupabaseQuery } = require('../useSupabaseQuery');
    const mockData = {
      casosActivos: 45,
      casosTotal: 150,
      trabajadores: 120,
      emosPendientes: 5,
    };
    useSupabaseQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual(mockData);
  });

  test('usa empresa activa en queryKey', () => {
    const { useSupabaseQuery } = require('../useSupabaseQuery');
    useSupabaseQuery.mockReturnValue({
      data: {
        casosActivos: 0,
        casosTotal: 0,
        trabajadores: 0,
        emosPendientes: 0,
      },
      isLoading: false,
      error: null,
    });

    renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    expect(useSupabaseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['dashboard-stats', '1']),
      })
    );
  });

  test('usa "all" en queryKey cuando no hay empresa activa', () => {
    mockUseCompany.mockReturnValue({
      empresaActiva: null,
      empresas: [],
      isLoading: false,
      setEmpresaActiva: jest.fn(),
      refreshEmpresas: jest.fn(),
      addEmpresa: jest.fn(),
      updateEmpresa: jest.fn(),
      deleteEmpresa: jest.fn(),
    });

    const { useSupabaseQuery } = require('../useSupabaseQuery');
    useSupabaseQuery.mockReturnValue({
      data: {
        casosActivos: 0,
        casosTotal: 0,
        trabajadores: 0,
        emosPendientes: 0,
      },
      isLoading: false,
      error: null,
    });

    renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    expect(useSupabaseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(['dashboard-stats', 'all']),
      })
    );
  });

  test('maneja estado de carga', () => {
    const { useSupabaseQuery } = require('../useSupabaseQuery');
    useSupabaseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  test('maneja errores', () => {
    const { useSupabaseQuery } = require('../useSupabaseQuery');
    const mockError = new Error('Error al cargar estadísticas');
    useSupabaseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    expect(result.current.error).toEqual(mockError);
  });

  test('configura staleTime y gcTime correctamente', () => {
    const { useSupabaseQuery } = require('../useSupabaseQuery');
    useSupabaseQuery.mockReturnValue({
      data: {
        casosActivos: 0,
        casosTotal: 0,
        trabajadores: 0,
        emosPendientes: 0,
      },
      isLoading: false,
      error: null,
    });

    renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    expect(useSupabaseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        staleTime: 1000 * 60 * 2, // 2 minutos
        gcTime: 1000 * 60 * 5, // 5 minutos
      })
    );
  });
});

