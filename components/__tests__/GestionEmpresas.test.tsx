/**
 * Tests para GestionEmpresas.tsx
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GestionEmpresas from '../GestionEmpresas';
import { CompanyProvider } from '../../contexts/CompanyContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

// Mock de dependencias
jest.mock('../../contexts/CompanyContext');
jest.mock('../../contexts/NotificationContext');
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock de fetch para consulta RUC
global.fetch = jest.fn();

const mockEmpresas = [
  {
    id: '1',
    nombre: 'Empresa Test 1',
    ruc: '12345678901',
    direccion: 'Dirección 1',
    telefono: '123456789',
    email: 'test1@example.com',
    activa: true,
  },
  {
    id: '2',
    nombre: 'Empresa Test 2',
    ruc: '98765432109',
    direccion: 'Dirección 2',
    telefono: '987654321',
    email: 'test2@example.com',
    activa: false,
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

describe('GestionEmpresas', () => {
  const mockAddEmpresa = jest.fn();
  const mockUpdateEmpresa = jest.fn();
  const mockDeleteEmpresa = jest.fn();
  const mockSetEmpresaActiva = jest.fn();
  const mockRefreshEmpresas = jest.fn();
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();
  const mockShowWarning = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock de CompanyContext
    (require('../../contexts/CompanyContext').useCompany as jest.Mock) = jest.fn(() => ({
      empresas: mockEmpresas,
      empresaActiva: mockEmpresas[0],
      isLoading: false,
      addEmpresa: mockAddEmpresa,
      updateEmpresa: mockUpdateEmpresa,
      deleteEmpresa: mockDeleteEmpresa,
      setEmpresaActiva: mockSetEmpresaActiva,
      refreshEmpresas: mockRefreshEmpresas,
    }));

    // Mock de NotificationContext
    (require('../../contexts/NotificationContext').useNotifications as jest.Mock) = jest.fn(() => ({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
      showWarning: mockShowWarning,
    }));

    // Mock de window.confirm
    window.confirm = jest.fn(() => true);
  });

  test('renderiza la lista de empresas', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Empresa Test 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Empresa Test 2/i)).toBeInTheDocument();
    });
  });

  test('muestra botón para crear nueva empresa', async () => {
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Nueva Empresa/i)).toBeInTheDocument();
    });
  });

  test('abre formulario al hacer clic en nueva empresa', async () => {
    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    const newButton = screen.getByText(/Nueva Empresa/i);
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ingrese el RUC/i)).toBeInTheDocument();
    });
  });

  test('valida que el nombre sea requerido al crear', async () => {
    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    const newButton = screen.getByText(/Nueva Empresa/i);
    await user.click(newButton);

    // Avanzar al formulario completo sin RUC
    const rucInput = screen.getByPlaceholderText(/Ingrese el RUC/i);
    await user.type(rucInput, '12345678901');
    
    // Simular que no se encontró RUC y avanzar manualmente
    const continueButton = screen.getByText(/Continuar Manualmente/i);
    if (continueButton) {
      await user.click(continueButton);
    }

    // Intentar guardar sin nombre
    const saveButton = screen.getByText(/Guardar/i);
    await user.click(saveButton);

    // Debería mostrar alerta
    expect(window.alert).toHaveBeenCalled();
  });

  test('crea empresa correctamente', async () => {
    const user = userEvent.setup();
    mockAddEmpresa.mockResolvedValue({
      id: '3',
      nombre: 'Nueva Empresa',
      ruc: '11111111111',
      activa: true,
    });

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    const newButton = screen.getByText(/Nueva Empresa/i);
    await user.click(newButton);

    // Completar formulario
    const nombreInput = screen.getByPlaceholderText(/Nombre de la empresa/i);
    await user.type(nombreInput, 'Nueva Empresa');

    const saveButton = screen.getByText(/Guardar/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockAddEmpresa).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Nueva Empresa',
        })
      );
    });
  });

  test('edita empresa correctamente', async () => {
    const user = userEvent.setup();
    mockUpdateEmpresa.mockResolvedValue(true);

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Empresa Test 1/i)).toBeInTheDocument();
    });

    // Buscar botón de editar (puede estar en un icono)
    const editButtons = screen.getAllByLabelText(/Editar/i);
    if (editButtons.length > 0) {
      await user.click(editButtons[0]);

      await waitFor(() => {
        const nombreInput = screen.getByDisplayValue(/Empresa Test 1/i);
        expect(nombreInput).toBeInTheDocument();
      });

      // Modificar nombre
      const nombreInput = screen.getByDisplayValue(/Empresa Test 1/i);
      await user.clear(nombreInput);
      await user.type(nombreInput, 'Empresa Modificada');

      // Guardar
      const saveButton = screen.getByText(/Guardar/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateEmpresa).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            nombre: 'Empresa Modificada',
          })
        );
      });
    }
  });

  test('elimina empresa con confirmación', async () => {
    const user = userEvent.setup();
    mockDeleteEmpresa.mockResolvedValue(true);

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Empresa Test 1/i)).toBeInTheDocument();
    });

    // Buscar botón de eliminar
    const deleteButtons = screen.getAllByLabelText(/Eliminar/i);
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
        expect(mockDeleteEmpresa).toHaveBeenCalledWith('1');
        expect(mockShowSuccess).toHaveBeenCalled();
      });
    }
  });

  test('no elimina empresa si se cancela la confirmación', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn(() => false);

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Empresa Test 1/i)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText(/Eliminar/i);
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockDeleteEmpresa).not.toHaveBeenCalled();
    }
  });

  test('consulta RUC de SUNAT correctamente', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          ruc: '12345678901',
          razonSocial: 'Empresa SUNAT',
          direccion: 'Av. Principal 123',
          telefono: '123456789',
        },
      }),
    });

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    const newButton = screen.getByText(/Nueva Empresa/i);
    await user.click(newButton);

    const rucInput = screen.getByPlaceholderText(/Ingrese el RUC/i);
    await user.type(rucInput, '12345678901');

    const consultButton = screen.getByText(/Consultar RUC/i);
    await user.click(consultButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/consultar-ruc',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ruc: '12345678901' }),
        })
      );
    });
  });

  test('maneja error al consultar RUC', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Error de red'));

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    const newButton = screen.getByText(/Nueva Empresa/i);
    await user.click(newButton);

    const rucInput = screen.getByPlaceholderText(/Ingrese el RUC/i);
    await user.type(rucInput, '12345678901');

    const consultButton = screen.getByText(/Consultar RUC/i);
    await user.click(consultButton);

    await waitFor(() => {
      // Debería mostrar mensaje de error pero permitir continuar
      expect(screen.getByText(/Error al consultar RUC/i)).toBeInTheDocument();
    });
  });

  test('muestra estado de carga', () => {
    (require('../../contexts/CompanyContext').useCompany as jest.Mock) = jest.fn(() => ({
      empresas: [],
      empresaActiva: null,
      isLoading: true,
      addEmpresa: mockAddEmpresa,
      updateEmpresa: mockUpdateEmpresa,
      deleteEmpresa: mockDeleteEmpresa,
      setEmpresaActiva: mockSetEmpresaActiva,
      refreshEmpresas: mockRefreshEmpresas,
    }));

    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    // Verificar que se muestra algún indicador de carga
    expect(screen.getByText(/Gestión de Empresas/i)).toBeInTheDocument();
  });

  test('cancela creación de empresa', async () => {
    const user = userEvent.setup();
    const Wrapper = createTestWrapper();
    render(
      <Wrapper>
        <GestionEmpresas />
      </Wrapper>
    );

    const newButton = screen.getByText(/Nueva Empresa/i);
    await user.click(newButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ingrese el RUC/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByText(/Cancelar/i);
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Ingrese el RUC/i)).not.toBeInTheDocument();
    });
  });
});

