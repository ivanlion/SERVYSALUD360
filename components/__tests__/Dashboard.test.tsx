/**
 * Tests para Dashboard.tsx
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../Dashboard';
import { CompanyProvider } from '../../contexts/CompanyContext';
import { UserProvider } from '../../contexts/UserContext';
import { NavigationProvider } from '../../contexts/NavigationContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';

// Mock de hooks y dependencias
jest.mock('../../hooks/useDashboardStats');
jest.mock('../../contexts/NavigationContext');
jest.mock('../../contexts/CompanyContext');
jest.mock('../../contexts/UserContext');

const mockUseDashboardStats = useDashboardStats as jest.MockedFunction<typeof useDashboardStats>;

// Wrapper con todos los providers necesarios
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <NavigationProvider>
          <UserProvider>
            <CompanyProvider>
              {children}
            </CompanyProvider>
          </UserProvider>
        </NavigationProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
};

describe('Dashboard', () => {
  const mockSetCurrentView = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnCreate = jest.fn();

  const mockStats = {
    casosActivos: 45,
    casosTotal: 150,
    trabajadores: 120,
    emosPendientes: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock de NavigationContext
    (require('../../contexts/NavigationContext').useNavigation as jest.Mock) = jest.fn(() => ({
      currentView: 'DASHBOARD',
      setCurrentView: mockSetCurrentView,
      toggleSidebar: jest.fn(),
    }));

    // Mock de CompanyContext
    (require('../../contexts/CompanyContext').useCompany as jest.Mock) = jest.fn(() => ({
      empresaActiva: { id: '1', nombre: 'Empresa Test' },
      empresas: [
        { id: '1', nombre: 'Empresa Test' },
        { id: '2', nombre: 'Empresa Test 2' },
      ],
      isLoading: false,
      setEmpresaActiva: jest.fn(),
      refreshEmpresas: jest.fn(),
    }));

    // Mock de UserContext
    (require('../../contexts/UserContext').useUser as jest.Mock) = jest.fn(() => ({
      user: { email: 'test@example.com' },
      profile: { full_name: 'Test User' },
      isLoading: false,
      refreshProfile: jest.fn(),
    }));

    // Mock de useDashboardStats
    mockUseDashboardStats.mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);
  });

  test('renderiza el dashboard correctamente', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Bienvenido/i)).toBeInTheDocument();
    });
  });

  test('muestra el nombre del usuario en el saludo', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Bienvenido, Test User/i)).toBeInTheDocument();
    });
  });

  test('muestra las estadísticas principales', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/45/)).toBeInTheDocument(); // Casos activos
      expect(screen.getByText(/120/)).toBeInTheDocument(); // Trabajadores
    });
  });

  test('muestra la empresa activa cuando está disponible', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Empresa activa: Empresa Test/i)).toBeInTheDocument();
    });
  });

  test('muestra todas las tarjetas del dashboard', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Trabajo Modificado/i)).toBeInTheDocument();
      expect(screen.getByText(/Vigilancia Médica/i)).toBeInTheDocument();
      expect(screen.getByText(/Subir EMO/i)).toBeInTheDocument();
      expect(screen.getByText(/Gestión de Empresas/i)).toBeInTheDocument();
      expect(screen.getByText(/Ley 29733/i)).toBeInTheDocument();
    });
  });

  test('las tarjetas son clickeables y navegan correctamente', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      const trabajoModificadoCard = screen.getByText(/Trabajo Modificado/i).closest('button');
      expect(trabajoModificadoCard).toBeInTheDocument();
    });

    const trabajoModificadoCard = screen.getByText(/Trabajo Modificado/i).closest('button');
    if (trabajoModificadoCard) {
      fireEvent.click(trabajoModificadoCard);
      expect(mockSetCurrentView).toHaveBeenCalledWith('WORK_MODIFIED_DASHBOARD');
    }
  });

  test('muestra badges en las tarjetas cuando hay datos', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/45 activos/i)).toBeInTheDocument();
      expect(screen.getByText(/2 empresas/i)).toBeInTheDocument();
      expect(screen.getByText(/120 trabajadores/i)).toBeInTheDocument();
    });
  });

  test('muestra estado de carga mientras obtiene datos', () => {
    mockUseDashboardStats.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    } as any);

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    // Las estadísticas no deberían mostrarse mientras carga
    expect(screen.queryByText(/45/)).not.toBeInTheDocument();
  });

  test('maneja correctamente cuando no hay empresa activa', async () => {
    (require('../../contexts/CompanyContext').useCompany as jest.Mock) = jest.fn(() => ({
      empresaActiva: null,
      empresas: [],
      isLoading: false,
      setEmpresaActiva: jest.fn(),
      refreshEmpresas: jest.fn(),
    }));

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Empresa activa:/i)).not.toBeInTheDocument();
    });
  });

  test('muestra el nombre del usuario desde email si no hay full_name', async () => {
    (require('../../contexts/UserContext').useUser as jest.Mock) = jest.fn(() => ({
      user: { email: 'juan.perez@example.com' },
      profile: { full_name: null },
      isLoading: false,
      refreshProfile: jest.fn(),
    }));

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Bienvenido, Juan.perez/i)).toBeInTheDocument();
    });
  });

  test('muestra "Usuario" cuando no hay email ni nombre', async () => {
    (require('../../contexts/UserContext').useUser as jest.Mock) = jest.fn(() => ({
      user: null,
      profile: null,
      isLoading: false,
      refreshProfile: jest.fn(),
    }));

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Bienvenido, Usuario/i)).toBeInTheDocument();
    });
  });

  test('muestra highlight en tarjeta de Subir EMO', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      const uploadCard = screen.getByText(/Subir EMO/i).closest('button');
      expect(uploadCard).toBeInTheDocument();
      expect(screen.getByText(/Nuevo con IA/i)).toBeInTheDocument();
    });
  });

  test('muestra tarjeta destacada para Administración', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <Dashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Administración/i)).toBeInTheDocument();
      expect(screen.getByText(/Destacado/i)).toBeInTheDocument();
    });
  });
});

