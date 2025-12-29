/**
 * Helper utilities para clases de dark mode
 * 
 * Proporciona clases predefinidas para facilitar la aplicación de estilos dark mode
 * 
 * @module utils/dark-mode-helper
 */

export const darkModeClasses = {
  // Backgrounds
  bg: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
    card: 'bg-white dark:bg-gray-800',
    surface: 'bg-gray-100 dark:bg-gray-700',
  },
  
  // Borders
  border: {
    default: 'border-gray-200 dark:border-gray-700',
    light: 'border-gray-300 dark:border-gray-600',
    strong: 'border-gray-400 dark:border-gray-500',
  },
  
  // Text
  text: {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-600 dark:text-gray-400',
    muted: 'text-gray-500 dark:text-gray-500',
    inverse: 'text-white dark:text-gray-900',
  },
  
  // Buttons
  button: {
    primary: 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white',
    danger: 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white',
    success: 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white',
  },
  
  // Inputs
  input: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
  
  // Cards
  card: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm',
  
  // Hover states
  hover: {
    bg: 'hover:bg-gray-50 dark:hover:bg-gray-800',
    text: 'hover:text-gray-900 dark:hover:text-white',
  },
};

/**
 * Combina múltiples clases de dark mode
 */
export function combineDarkClasses(...classes: string[]): string {
  return classes.join(' ');
}

/**
 * Obtiene clases para un componente específico
 */
export const componentClasses = {
  header: combineDarkClasses(
    darkModeClasses.bg.primary,
    darkModeClasses.border.default,
    'sticky top-0 z-50'
  ),
  
  sidebar: combineDarkClasses(
    darkModeClasses.bg.primary,
    darkModeClasses.border.default,
    'border-r'
  ),
  
  card: combineDarkClasses(
    darkModeClasses.bg.card,
    darkModeClasses.border.default,
    'rounded-lg shadow-sm'
  ),
  
  input: combineDarkClasses(
    darkModeClasses.input,
    'rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
  ),
  
  button: {
    primary: combineDarkClasses(
      darkModeClasses.button.primary,
      'rounded-lg px-4 py-2 font-medium transition-colors'
    ),
    secondary: combineDarkClasses(
      darkModeClasses.button.secondary,
      'rounded-lg px-4 py-2 font-medium transition-colors'
    ),
  },
};

