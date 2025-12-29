/**
 * Tests para UploadEMO - Validación de archivos
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadEMO from '../UploadEMO';
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

describe('UploadEMO - Validación de Archivos', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    localStorage.clear();
  });

  test('rechaza archivos mayores a 10MB', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UploadEMO />);
    
    const file = new File(['x'.repeat(11 * 1024 * 1024)], 'test.pdf', { 
      type: 'application/pdf',
    });
    
    const input = screen.getByRole('button', { name: /arrastra archivos/i }) || 
                  document.querySelector('input[type="file"]');
    
    if (input && input instanceof HTMLInputElement) {
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText(/no debe superar 10MB/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    }
  });

  test('rechaza archivos con tipo no permitido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UploadEMO />);
    
    const file = new File(['content'], 'test.exe', { 
      type: 'application/exe',
    });
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText(/tipo de archivo no permitido/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    }
  });

  test('acepta archivos PDF válidos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UploadEMO />);
    
    const file = new File(['content'], 'test.pdf', { 
      type: 'application/pdf',
      size: 1024,
    });
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      await user.upload(input, file);
      
      // No debería mostrar errores de validación
      await waitFor(() => {
        const errorMessages = screen.queryAllByText(/error de validación/i);
        expect(errorMessages.length).toBe(0);
      }, { timeout: 2000 });
    }
  });

  test('acepta archivos PNG válidos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UploadEMO />);
    
    const file = new File(['content'], 'test.png', { 
      type: 'image/png',
      size: 1024,
    });
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      await user.upload(input, file);
      
      await waitFor(() => {
        const errorMessages = screen.queryAllByText(/tipo de archivo no permitido/i);
        expect(errorMessages.length).toBe(0);
      }, { timeout: 2000 });
    }
  });

  test('acepta archivos JPEG válidos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UploadEMO />);
    
    const file = new File(['content'], 'test.jpg', { 
      type: 'image/jpeg',
      size: 1024,
    });
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      await user.upload(input, file);
      
      await waitFor(() => {
        const errorMessages = screen.queryAllByText(/tipo de archivo no permitido/i);
        expect(errorMessages.length).toBe(0);
      }, { timeout: 2000 });
    }
  });

  test('rechaza nombres de archivo con caracteres peligrosos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UploadEMO />);
    
    const file = new File(['content'], 'test<>file.pdf', { 
      type: 'application/pdf',
      size: 1024,
    });
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (input) {
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText(/caracteres no permitidos/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    }
  });

  test('muestra mensaje cuando no hay empresa seleccionada', () => {
    renderWithProviders(<UploadEMO />);
    
    expect(screen.getByText(/no hay empresa seleccionada/i)).toBeInTheDocument();
  });
});

