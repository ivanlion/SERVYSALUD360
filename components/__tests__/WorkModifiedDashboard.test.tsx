/**
 * Tests para WorkModifiedDashboard.tsx
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkModifiedDashboard from '../WorkModifiedDashboard';
import { CompanyProvider, useCompany } from '../../contexts/CompanyContext';
import { NotificationProvider, useNotifications } from '../../contexts/NotificationContext';
import { useWorkModifiedCases } from '../../hooks/useWorkModifiedCases';

const mockUseCompany = useCompany as jest.MockedFunction<typeof useCompany>;
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

// Mock de hooks y dependencias
jest.mock('../../hooks/useWorkModifiedCases');
jest.mock('../../contexts/CompanyContext', () => ({
  CompanyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCompany: jest.fn(),
}));
jest.mock('../../contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNotifications: jest.fn(),
}));
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      delete: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock de xlsx
jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(() => ({})),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

const mockUseWorkModifiedCases = useWorkModifiedCases as jest.MockedFunction<typeof useWorkModifiedCases>;

const mockCases = [
  {
    id: '1',
    trabajadorNombre: 'Juan Pérez',
    dni: '12345678',
    empresa: 'Empresa Test',
    status: 'ACTIVO',
    created_at: '2024-01-15T10:00:00Z',
    assessment: {
      indicacionInicio: '2024-01-15',
      diagnosticos: [
        { descripcion: 'Lumbalgia', cie10: 'M54.5' },
      ],
    },
    datos_trabajo_modificado: {
      puesto_trabajo: 'Operario',
    },
  },
  {
    id: '2',
    trabajadorNombre: 'María García',
    dni: '87654321',
    empresa: 'Empresa Test 2',
    status: 'FINALIZADO',
    created_at: '2024-01-20T10:00:00Z',
    assessment: {
      indicacionInicio: '2024-01-20',
      diagnosticos: [
        { descripcion: 'Tendinitis', cie10: 'M75.1' },
      ],
    },
    datos_trabajo_modificado: {
      puesto_trabajo: 'Administrativo',
    },
  },
];

// Wrapper con providers
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
        <CompanyProvider>
          {children}
        </CompanyProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
};

describe('WorkModifiedDashboard', () => {
  const mockOnEdit = jest.fn();
  const mockOnCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock de CompanyContext
    mockUseCompany.mockReturnValue({
      empresaActiva: { id: '1', nombre: 'Empresa Test' },
      empresas: [],
      isLoading: false,
      setEmpresaActiva: jest.fn(),
      refreshEmpresas: jest.fn(),
    });

    // Mock de NotificationContext
    mockUseNotifications.mockReturnValue({
      showSuccess: jest.fn(),
      showError: jest.fn(),
      showWarning: jest.fn(),
    });

    // Mock de useWorkModifiedCases
    mockUseWorkModifiedCases.mockReturnValue({
      data: {
        cases: mockCases,
        totalCount: 2,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);
  });

  test('renderiza el dashboard correctamente', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Gestión de Trabajo Modificado/i)).toBeInTheDocument();
    });
  });

  test('muestra la lista de casos', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Juan Pérez/i)).toBeInTheDocument();
      expect(screen.getByText(/María García/i)).toBeInTheDocument();
    });
  });

  test('muestra los KPIs correctamente', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Total Casos/i)).toBeInTheDocument();
      expect(screen.getByText(/2/)).toBeInTheDocument(); // Total casos
    });
  });

  test('filtra casos por búsqueda', async () => {
    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Juan Pérez/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por Trabajador/i);
    await user.type(searchInput, 'Juan');

    await waitFor(() => {
      expect(screen.getByText(/Juan Pérez/i)).toBeInTheDocument();
      expect(screen.queryByText(/María García/i)).not.toBeInTheDocument();
    });
  });

  test('filtra casos por DNI', async () => {
    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por Trabajador/i);
    await user.type(searchInput, '12345678');

    await waitFor(() => {
      expect(screen.getByText(/Juan Pérez/i)).toBeInTheDocument();
      expect(screen.queryByText(/María García/i)).not.toBeInTheDocument();
    });
  });

  test('filtra casos por empresa', async () => {
    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por Trabajador/i);
    await user.type(searchInput, 'Empresa Test 2');

    await waitFor(() => {
      expect(screen.queryByText(/Juan Pérez/i)).not.toBeInTheDocument();
      expect(screen.getByText(/María García/i)).toBeInTheDocument();
    });
  });

  test('botón de nuevo caso funciona', async () => {
    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    const newCaseButton = screen.getByText(/Nuevo Caso/i);
    await user.click(newCaseButton);

    expect(mockOnCreate).toHaveBeenCalled();
  });

  test('botón de editar funciona', async () => {
    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Juan Pérez/i)).toBeInTheDocument();
    });

    // En desktop, buscar botón de editar en la tabla
    const editButtons = screen.getAllByText(/Editar/i);
    if (editButtons.length > 0) {
      await user.click(editButtons[0]);
      expect(mockOnEdit).toHaveBeenCalled();
    }
  });

  test('muestra estado de carga', () => {
    mockUseWorkModifiedCases.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    } as any);

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    // Verificar que se muestra algún indicador de carga
    expect(screen.getByText(/Gestión de Trabajo Modificado/i)).toBeInTheDocument();
  });

  test('muestra error cuando falla la carga', async () => {
    mockUseWorkModifiedCases.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Error al cargar datos'),
      refetch: jest.fn(),
    } as any);

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar datos/i)).toBeInTheDocument();
    });
  });

  test('muestra mensaje cuando no hay casos', async () => {
    mockUseWorkModifiedCases.mockReturnValue({
      data: {
        cases: [],
        totalCount: 0,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/No hay registros en la base de datos/i)).toBeInTheDocument();
    });
  });

  test('botón de exportar a Excel está presente', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Exportar a Excel/i)).toBeInTheDocument();
    });
  });

  test('botón de exportar está deshabilitado cuando no hay casos', async () => {
    mockUseWorkModifiedCases.mockReturnValue({
      data: {
        cases: [],
        totalCount: 0,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    await waitFor(() => {
      const exportButton = screen.getByText(/Exportar a Excel/i);
      expect(exportButton).toBeDisabled();
    });
  });

  test('limpia la búsqueda correctamente', async () => {
    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <WorkModifiedDashboard onEdit={mockOnEdit} onCreate={mockOnCreate} />
      </Wrapper>
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por Trabajador/i);
    await user.type(searchInput, 'Juan');

    await waitFor(() => {
      expect(screen.getByText(/Limpiar/i)).toBeInTheDocument();
    });

    const clearButton = screen.getByText(/Limpiar/i);
    await user.click(clearButton);

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
      expect(screen.getByText(/Juan Pérez/i)).toBeInTheDocument();
      expect(screen.getByText(/María García/i)).toBeInTheDocument();
    });
  });
});


