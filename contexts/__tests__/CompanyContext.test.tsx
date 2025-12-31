/**
 * Tests para CompanyContext.tsx
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { CompanyProvider, useCompany } from '../CompanyContext';
import { supabase } from '../../lib/supabase';

// Mock de dependencias
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: jest.fn(() => [null, jest.fn()]),
}));

const mockEmpresas = [
  {
    id: '1',
    nombre: 'Empresa Test 1',
    ruc: '12345678901',
    direccion: 'Dirección 1',
    telefono: '123456789',
    email: 'test1@example.com',
    activa: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: '2',
    nombre: 'Empresa Test 2',
    ruc: '98765432109',
    direccion: 'Dirección 2',
    telefono: '987654321',
    email: 'test2@example.com',
    activa: false,
    created_at: '2024-01-02',
    updated_at: '2024-01-02',
  },
];

describe('CompanyContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock de localStorage
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();

    // Mock de auth
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
      error: null,
    });

    // Mock de from().select()
    const mockSelect = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockResolvedValue({
      data: mockEmpresas,
      error: null,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      order: mockOrder,
      limit: mockLimit,
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({
        data: [{ id: '3', ...mockEmpresas[0] }],
        error: null,
      }),
      update: jest.fn().mockResolvedValue({
        data: [{ id: '1', nombre: 'Empresa Actualizada' }],
        error: null,
      }),
      delete: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });
  });

  test('carga empresas al inicializar', async () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.empresas.length).toBeGreaterThan(0);
  });

  test('setEmpresaActiva actualiza la empresa seleccionada', async () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.empresas.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.setEmpresaActiva(mockEmpresas[0]);
    });

    expect(result.current.empresaActiva).toEqual(mockEmpresas[0]);
  });

  test('refreshEmpresas recarga la lista de empresas', async () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialCount = result.current.empresas.length;

    act(() => {
      result.current.refreshEmpresas();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.empresas.length).toBe(initialCount);
  });

  test('addEmpresa agrega una nueva empresa', async () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const nuevaEmpresa = {
      nombre: 'Nueva Empresa',
      ruc: '11111111111',
      direccion: 'Nueva Dirección',
      activa: true,
    };

    let addedEmpresa;
    await act(async () => {
      addedEmpresa = await result.current.addEmpresa(nuevaEmpresa);
    });

    expect(addedEmpresa).toBeTruthy();
    expect(supabase.from).toHaveBeenCalledWith('empresas');
  });

  test('updateEmpresa actualiza una empresa existente', async () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updates = {
      nombre: 'Empresa Actualizada',
    };

    let success;
    await act(async () => {
      success = await result.current.updateEmpresa('1', updates);
    });

    expect(success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('empresas');
  });

  test('deleteEmpresa elimina una empresa', async () => {
    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteEmpresa('1');
    });

    expect(success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('empresas');
  });

  test('maneja errores al cargar empresas', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Error de conexión' },
      }),
    });

    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.empresas).toEqual([]);
  });

  test('maneja cuando no hay usuario autenticado', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.empresas).toEqual([]);
    expect(result.current.empresaActiva).toBeNull();
  });

  test('restaura empresa activa desde localStorage', async () => {
    Storage.prototype.getItem = jest.fn(() => '1');

    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // La empresa activa debería estar restaurada
    expect(result.current.empresaActiva).toBeTruthy();
  });

  test('maneja errores al agregar empresa', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: mockEmpresas,
        error: null,
      }),
      insert: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Error al insertar' },
      }),
    });

    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const nuevaEmpresa = {
      nombre: 'Nueva Empresa',
      activa: true,
    };

    let addedEmpresa;
    await act(async () => {
      addedEmpresa = await result.current.addEmpresa(nuevaEmpresa);
    });

    expect(addedEmpresa).toBeNull();
  });

  test('maneja errores al actualizar empresa', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: mockEmpresas,
        error: null,
      }),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Error al actualizar' },
      }),
    });

    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updates = { nombre: 'Actualizada' };
    let success;
    await act(async () => {
      success = await result.current.updateEmpresa('1', updates);
    });

    expect(success).toBe(false);
  });

  test('maneja errores al eliminar empresa', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: mockEmpresas,
        error: null,
      }),
      eq: jest.fn().mockReturnThis(),
      delete: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Error al eliminar' },
      }),
    });

    const { result } = renderHook(() => useCompany(), {
      wrapper: CompanyProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.deleteEmpresa('1');
    });

    expect(success).toBe(false);
  });
});



