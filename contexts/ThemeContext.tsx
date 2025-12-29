/**
 * ThemeContext - Contexto para gestión de temas (Light/Dark/System)
 * 
 * Maneja el tema de la aplicación con persistencia en localStorage
 * y detección de preferencia del sistema
 * 
 * @module contexts/ThemeContext
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type EffectiveTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>('light');
  const [mounted, setMounted] = useState(false);

  // Detectar preferencia del sistema
  const getSystemTheme = (): EffectiveTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Cargar tema guardado al montar
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
      
      if (savedTheme !== 'system') {
        setEffectiveTheme(savedTheme);
      } else {
        setEffectiveTheme(getSystemTheme());
      }
    } else {
      // Si no hay tema guardado, usar preferencia del sistema
      setEffectiveTheme(getSystemTheme());
    }
  }, []);

  // Escuchar cambios en preferencia del sistema
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setEffectiveTheme(e.matches ? 'dark' : 'light');
      }
    };

    // Navegadores modernos
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback para navegadores antiguos
      mediaQuery.addListener(handleChange);
    }

    // Establecer tema inicial si es system
    if (theme === 'system') {
      setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [theme, mounted]);

  // Aplicar tema al documento inmediatamente
  useEffect(() => {
    const root = document.documentElement;
    
    // Remover clases anteriores
    root.classList.remove('light', 'dark');
    
    // Agregar clase del tema efectivo
    root.classList.add(effectiveTheme);
    
    // Para Tailwind dark mode - siempre agregar/remover la clase 'dark'
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Agregar atributo data-theme para CSS personalizado
    root.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  // Aplicar tema inicial al montar (antes de que se cargue desde localStorage)
  useEffect(() => {
    const root = document.documentElement;
    const initialTheme = getSystemTheme();
    
    // Aplicar tema inicial inmediatamente
    root.classList.remove('light', 'dark');
    root.classList.add(initialTheme);
    
    if (initialTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    root.setAttribute('data-theme', initialTheme);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Guardar en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
    
    // Actualizar effectiveTheme inmediatamente
    let themeToApply: EffectiveTheme;
    if (newTheme !== 'system') {
      themeToApply = newTheme;
      setEffectiveTheme(newTheme);
    } else {
      themeToApply = getSystemTheme();
      setEffectiveTheme(themeToApply);
    }
    
    // Aplicar tema inmediatamente (sin esperar al useEffect)
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      
      // Remover todas las clases de tema
      root.classList.remove('light', 'dark');
      
      // Agregar clase del tema
      root.classList.add(themeToApply);
      
      // Para Tailwind dark mode
      if (themeToApply === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      root.setAttribute('data-theme', themeToApply);
    }
  };

  const toggleTheme = () => {
    // Toggle entre light y dark (no incluye system)
    const newTheme: Theme = effectiveTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Siempre proporcionar el contexto, incluso cuando no está montado
  // Esto evita errores durante la hidratación
  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

