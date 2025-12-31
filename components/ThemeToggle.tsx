/**
 * ThemeToggle - Componente para cambiar entre temas
 * 
 * Proporciona toggle para cambiar entre modo claro, oscuro y sistema
 * 
 * @component
 */

'use client';

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';
import { logger } from '../utils/logger';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const { theme, effectiveTheme, setTheme } = useTheme();

  const themes: Array<{ value: Theme; icon: React.ReactNode; label: string }> = [
    { 
      value: 'light', 
      icon: <Sun className="w-4 h-4" />, 
      label: 'Claro' 
    },
    { 
      value: 'dark', 
      icon: <Moon className="w-4 h-4" />, 
      label: 'Oscuro' 
    },
    { 
      value: 'system', 
      icon: <Monitor className="w-4 h-4" />, 
      label: 'Sistema' 
    },
  ];

  return (
    <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-800">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => {
            logger.debug(`[ThemeToggle] Cambiando tema a: ${t.value}`, { theme: t.value });
            setTheme(t.value);
          }}
          className={`
            px-3 py-1.5 rounded-md transition-all duration-200
            flex items-center gap-2
            text-sm font-medium
            min-h-[36px]
            ${theme === t.value
              ? 'bg-gray-100 dark:bg-gray-700 shadow-sm'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }
          `}
          title={t.label}
          aria-label={`Cambiar a tema ${t.label}`}
        >
          <span className={theme === t.value ? 'text-gray-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-500'}>
            {t.icon}
          </span>
          <span className={`hidden sm:inline font-medium ${theme === t.value ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Versión compacta para móvil - solo toggle entre light/dark
 */
export function ThemeToggleCompact() {
  const { toggleTheme, effectiveTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
        p-2 rounded-lg
        bg-white dark:bg-gray-900
        hover:bg-gray-100 dark:hover:bg-gray-800
        border border-gray-200 dark:border-gray-800
        transition-all duration-200
        min-w-[44px] min-h-[44px]
        flex items-center justify-center
      "
      aria-label={`Cambiar a tema ${effectiveTheme === 'light' ? 'oscuro' : 'claro'}`}
      title={`Cambiar a tema ${effectiveTheme === 'light' ? 'oscuro' : 'claro'}`}
    >
      {effectiveTheme === 'light' ? (
        <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      ) : (
        <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      )}
    </button>
  );
}

