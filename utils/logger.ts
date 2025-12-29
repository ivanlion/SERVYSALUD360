/**
 * Logger utility para manejo centralizado de logs
 * 
 * En desarrollo: muestra todos los logs en consola
 * En producción: solo muestra errores y los envía a servicio de logging
 * 
 * @module utils/logger
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logger con niveles de log apropiados
 */
export const logger = {
  /**
   * Log de información general (solo en desarrollo)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[LOG]', ...args);
    }
  },

  /**
   * Log de información de debugging (solo en desarrollo)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log de advertencias (solo en desarrollo)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Log de errores (siempre visible, en producción enviar a servicio de logging)
   */
  error: (error: Error | string, context?: Record<string, any>) => {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (isDevelopment) {
      console.error('[ERROR]', errorMessage, errorStack, context);
    } else {
      // En producción, aquí se enviaría a un servicio de logging
      // Ejemplo: Sentry, LogRocket, Datadog, etc.
      console.error('[ERROR]', errorMessage, context);
      
      // TODO: Integrar servicio de logging en producción
      // Sentry.captureException(error, { extra: context });
    }
  },

  /**
   * Log de información de rendimiento (solo en desarrollo)
   */
  performance: (label: string, duration: number) => {
    if (isDevelopment) {
      console.log(`[PERF] ${label}: ${duration}ms`);
    }
  },
};


