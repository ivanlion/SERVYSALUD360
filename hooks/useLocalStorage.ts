/**
 * Hook seguro para localStorage que funciona en SSR
 * 
 * Evita errores de "localStorage is not defined" durante Server-Side Rendering
 * 
 * @module hooks/useLocalStorage
 */

import { useState, useEffect } from 'react';

/**
 * Hook para usar localStorage de forma segura en Next.js
 * 
 * @param key - Clave del localStorage
 * @param initialValue - Valor inicial si no existe en localStorage
 * @returns Tuple con el valor actual y función para actualizarlo
 * 
 * @example
 * ```tsx
 * const [empresaActivaId, setEmpresaActivaId] = useLocalStorage<string | null>('empresa_activa_id', null);
 * 
 * // Usar el valor
 * useEffect(() => {
 *   if (empresaActivaId) {
 *     // Hacer algo con el ID
 *   }
 * }, [empresaActivaId]);
 * 
 * // Actualizar el valor
 * setEmpresaActivaId('nuevo-id');
 * ```
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Estado que se sincroniza con localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Solo acceder a localStorage en el cliente
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      // Validar que el item sea un JSON válido antes de parsear
      const trimmed = item.trim();
      if (trimmed === '' || (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.match(/^["\d-]/))) {
        // Si no parece un JSON válido, limpiar y retornar valor inicial
        window.localStorage.removeItem(key);
        return initialValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error al leer localStorage key "${key}":`, error);
      // Limpiar el valor inválido
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        // Ignorar errores al limpiar
      }
      return initialValue;
    }
  });

  // Función para actualizar el valor en estado y localStorage
  const setValue = (value: T) => {
    try {
      // Permitir que el valor sea una función para tener la misma API que useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Actualizar estado
      setStoredValue(valueToStore);
      
      // Actualizar localStorage solo en el cliente
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error al escribir localStorage key "${key}":`, error);
    }
  };

  // Sincronizar con cambios en otras pestañas/ventanas
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch (error) {
          console.error(`Error al parsear nuevo valor de localStorage key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}

