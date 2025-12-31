/**
 * Logger centralizado para el servidor MCP
 * 
 * Usa el logger principal del proyecto para mantener consistencia
 * 
 * @module mcp-server/src/utils/logger
 */

// Importar logger del proyecto principal
// Nota: En producción, esto podría usar un logger específico para MCP
let loggerInstance: any = null;

/**
 * Inicializa el logger (se puede hacer lazy loading)
 */
function getLogger() {
  if (!loggerInstance) {
    try {
      // Intentar importar el logger del proyecto principal
      // Si no está disponible, usar console como fallback
      loggerInstance = {
        info: (message: string, context?: any) => {
          console.log(`[MCP INFO] ${message}`, context || '');
        },
        error: (error: Error | string, context?: any) => {
          console.error(`[MCP ERROR]`, error, context || '');
        },
        warn: (message: string, context?: any) => {
          console.warn(`[MCP WARN] ${message}`, context || '');
        },
        debug: (message: string, context?: any) => {
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[MCP DEBUG] ${message}`, context || '');
          }
        },
      };
    } catch {
      // Fallback a console si no se puede importar
      loggerInstance = {
        info: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        debug: console.debug.bind(console),
      };
    }
  }
  return loggerInstance;
}

/**
 * Logger para el servidor MCP
 */
export const mcpLogger = {
  info: (message: string, context?: any) => {
    getLogger().info(`[MCP] ${message}`, { ...context, module: 'MCP' });
  },
  error: (error: Error | string, context?: any) => {
    const err = error instanceof Error ? error : new Error(error);
    getLogger().error(err, { ...context, module: 'MCP' });
  },
  warn: (message: string, context?: any) => {
    getLogger().warn(`[MCP] ${message}`, { ...context, module: 'MCP' });
  },
  debug: (message: string, context?: any) => {
    getLogger().debug(`[MCP] ${message}`, { ...context, module: 'MCP' });
  },
};

