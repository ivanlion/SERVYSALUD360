/**
 * Sistema de caché LRU para el servidor MCP
 * 
 * Cachea resultados de operaciones comunes para mejorar el rendimiento
 * 
 * @module mcp-server/src/utils/cache
 */

import { LRUCache } from 'lru-cache';

/**
 * Configuración del caché
 */
const CACHE_CONFIG = {
  max: 100, // Máximo 100 entradas
  ttl: 1000 * 60 * 5, // TTL de 5 minutos
};

/**
 * Caché principal para resultados de herramientas MCP
 */
const mcpCache = new LRUCache<string, any>(CACHE_CONFIG);

/**
 * Genera una clave de caché a partir de los argumentos
 * 
 * @param toolName - Nombre de la herramienta
 * @param args - Argumentos de la herramienta
 * @returns Clave de caché
 */
export function generateCacheKey(toolName: string, args: Record<string, any>): string {
  // Ordenar keys para consistencia
  const sortedArgs = Object.keys(args)
    .sort()
    .reduce((acc, key) => {
      acc[key] = args[key];
      return acc;
    }, {} as Record<string, any>);
  
  return `${toolName}:${JSON.stringify(sortedArgs)}`;
}

/**
 * Obtiene un valor del caché
 * 
 * @param key - Clave de caché
 * @returns Valor cacheado o undefined
 */
export function getFromCache<T>(key: string): T | undefined {
  return mcpCache.get(key) as T | undefined;
}

/**
 * Guarda un valor en el caché
 * 
 * @param key - Clave de caché
 * @param value - Valor a cachear
 */
export function setInCache(key: string, value: any): void {
  mcpCache.set(key, value);
}

/**
 * Limpia el caché completo
 */
export function clearCache(): void {
  mcpCache.clear();
}

/**
 * Obtiene estadísticas del caché
 */
export function getCacheStats() {
  return {
    size: mcpCache.size,
    calculatedSize: mcpCache.calculatedSize,
  };
}

