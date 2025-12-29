/**
 * Tests para CaseForm - Validación de formularios
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CaseForm from '../CaseForm';
import { CompanyProvider } from '../../contexts/CompanyContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { ReactQueryProvider } from '../../lib/react-query';

// Wrapper con providers necesarios
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ReactQueryProvider>
      <CompanyProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </CompanyProvider>
    </ReactQueryProvider>
  );
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: AllTheProviders });
};

describe('CaseForm - Validación de Formularios', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('se renderiza correctamente', () => {
    renderWithProviders(
      <CaseForm onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    
    expect(screen.getByText(/datos generales/i)).toBeInTheDocument();
  });

  test('muestra el paso 1 por defecto', () => {
    renderWithProviders(
      <CaseForm onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    
    expect(screen.getByText(/paso 1/i)).toBeInTheDocument();
  });

  test('muestra botón de cancelar', () => {
    renderWithProviders(
      <CaseForm onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    expect(cancelButton).toBeInTheDocument();
  });

  test('llama a onCancel cuando se hace clic en cancelar', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CaseForm onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('muestra botón de guardar', () => {
    renderWithProviders(
      <CaseForm onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    
    const saveButtons = screen.getAllByRole('button', { name: /guardar/i });
    expect(saveButtons.length).toBeGreaterThan(0);
  });

  test('muestra botones de navegación entre pasos', () => {
    renderWithProviders(
      <CaseForm onSave={mockOnSave} onCancel={mockOnCancel} />
    );
    
    // Debería haber múltiples botones (navegación, guardar, cancelar)
    const allButtons = screen.getAllByRole('button');
    expect(allButtons.length).toBeGreaterThanOrEqual(2);
  });

  test('acepta initialData como prop', () => {
    const initialData = {
      id: 'test-id',
      status: 'ACTIVO' as const,
      createdAt: new Date().toISOString(),
      fecha: '2024-01-01',
      trabajadorNombre: 'Juan Pérez',
      dni: '12345678',
      sexo: 'Masculino' as const,
      jornadaLaboral: '40',
      puesto: 'Operario',
      telfContacto: '987654321',
      empresa: 'Test Empresa',
      gerencia: 'Test Gerencia',
      supervisor: 'Test Supervisor',
      supervisorTelf: '987654321',
      tipoEvento: 'ACCIDENTE_TRABAJO' as const,
      assessment: {
        diagnosticos: [{ descripcion: 'Test', cie10: '' }],
        indicacionInicio: '2024-01-01',
        indicacionDuracion: '10',
        medicoNombre: 'Dr. Test',
        alertaFarmacologica: 'SIN_EFECTO' as const,
        lateralidad: 'Derecha' as const,
      } as any,
      assessment2: {} as any,
      tareasRealizar: '',
      areaLugar: '',
      tareasPrincipales: '',
      comentariosSupervisor: '',
      reevaluaciones: [],
    };

    renderWithProviders(
      <CaseForm 
        initialData={initialData} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByDisplayValue('Juan Pérez')).toBeInTheDocument();
  });
});

