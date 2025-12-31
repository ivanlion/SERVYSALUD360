/**
 * Tests para useLocalStorage Hook
 * 
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('devuelve valor inicial cuando no hay nada en localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  test('guarda valor en localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    act(() => {
      result.current[1]('new value');
    });
    
    expect(result.current[0]).toBe('new value');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new value'));
  });

  test('lee valor existente de localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored value'));
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('stored value');
  });

  test('actualiza valor cuando se cambia', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    act(() => {
      result.current[1]('first value');
    });
    
    expect(result.current[0]).toBe('first value');
    
    act(() => {
      result.current[1]('second value');
    });
    
    expect(result.current[0]).toBe('second value');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('second value'));
  });

  test('maneja valores complejos (objetos)', () => {
    const initialValue = { name: 'test', id: 1 };
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue));
    
    act(() => {
      result.current[1]({ name: 'updated', id: 2 });
    });
    
    expect(result.current[0]).toEqual({ name: 'updated', id: 2 });
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify({ name: 'updated', id: 2 }));
  });

  test('maneja valores complejos (arrays)', () => {
    const initialValue: string[] = [];
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue));
    
    act(() => {
      result.current[1](['item1', 'item2']);
    });
    
    expect(result.current[0]).toEqual(['item1', 'item2']);
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify(['item1', 'item2']));
  });

  test('permite función como valor (similar a useState)', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0));
    
    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });
    
    expect(result.current[0]).toBe(1);
    
    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });
    
    expect(result.current[0]).toBe(2);
  });

  test('maneja errores de JSON inválido en localStorage', () => {
    // Simular JSON inválido en localStorage
    localStorage.setItem('test-key', 'invalid json{');
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    // Debería retornar el valor por defecto y limpiar el valor inválido
    expect(result.current[0]).toBe('default');
    // El valor inválido debería ser removido
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  test('maneja localStorage vacío correctamente', () => {
    localStorage.setItem('test-key', '');
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    expect(result.current[0]).toBe('default');
  });

  test('sincroniza con cambios de otras pestañas', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    // Simular cambio desde otra pestaña
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'test-key',
        newValue: JSON.stringify('changed from other tab'),
        oldValue: JSON.stringify('initial'),
        storageArea: localStorage,
      });
      window.dispatchEvent(event);
    });
    
    expect(result.current[0]).toBe('changed from other tab');
  });
});



