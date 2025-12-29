/**
 * Tests para UserContext.tsx
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { UserProvider, useUser } from '../UserContext';
import { supabase } from '../../lib/supabase';

// Mock de dependencias
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    role: 'admin',
  },
};

const mockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'admin',
  permissions: { read: true, write: true },
  created_at: '2024-01-01',
};

describe('UserContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock de getUser
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock de from().select()
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    });
  });

  test('carga perfil del usuario al inicializar', async () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.profile).toEqual(mockProfile);
  });

  test('refreshProfile recarga el perfil', async () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(supabase.auth.getUser).toHaveBeenCalled();
  });

  test('usa user_metadata cuando no hay perfil en tabla', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      full_name: mockUser.user_metadata.full_name,
      role: mockUser.user_metadata.role,
      permissions: null,
    });
  });

  test('maneja cuando no hay usuario autenticado', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  test('maneja errores al cargar perfil', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Error de autenticación' },
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  test('escucha cambios en autenticación', () => {
    const mockUnsubscribe = jest.fn();
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    });

    const { unmount } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  test('actualiza perfil cuando hay cambio de sesión', async () => {
    let authStateCallback: any;
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      };
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simular cambio de autenticación
    act(() => {
      authStateCallback('SIGNED_IN', {
        user: mockUser,
      });
    });

    await waitFor(() => {
      expect(result.current.user).toBeTruthy();
    });
  });

  test('limpia perfil cuando se cierra sesión', async () => {
    let authStateCallback: any;
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      };
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simular cierre de sesión
    act(() => {
      authStateCallback('SIGNED_OUT', null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('maneja perfil con email desde profileData', async () => {
    const profileWithEmail = {
      ...mockProfile,
      email: 'profile@example.com',
    };

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: profileWithEmail,
        error: null,
      }),
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile?.email).toBe('profile@example.com');
  });

  test('usa email del usuario si profile no tiene email', async () => {
    const profileWithoutEmail = {
      ...mockProfile,
      email: null,
    };

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: profileWithoutEmail,
        error: null,
      }),
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: UserProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile?.email).toBe(mockUser.email);
  });
});

