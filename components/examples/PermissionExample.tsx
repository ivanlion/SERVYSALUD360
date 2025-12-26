/**
 * Ejemplo de uso del hook useModulePermission
 * 
 * Este componente demuestra cómo usar el hook para controlar
 * el acceso y las acciones permitidas en un módulo
 * 
 * @module components/examples/PermissionExample
 */

'use client';

import React from 'react';
import { useModulePermission } from '../../hooks/useModulePermission';
import { Save, Eye, Lock, Loader2, Edit } from 'lucide-react';

/**
 * Ejemplo de componente que usa el hook useModulePermission
 * 
 * Muestra cómo:
 * - Bloquear el acceso completo si no tiene permiso
 * - Deshabilitar botones de guardar si solo tiene lectura
 * - Deshabilitar inputs si solo tiene lectura
 */
export default function PermissionExample() {
  // Usar el hook para verificar permisos del módulo 'trabajo_modificado'
  const { canRead, canWrite, permissionLevel, isLoading } = useModulePermission('trabajo_modificado');

  // Si está cargando, mostrar spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-indigo-600" size={24} />
        <span className="ml-2 text-gray-600">Verificando permisos...</span>
      </div>
    );
  }

  // Si no tiene acceso de lectura, mostrar mensaje
  if (!canRead) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <Lock className="mx-auto text-red-600 mb-2" size={32} />
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Acceso Denegado
        </h3>
        <p className="text-red-600">
          No tienes permiso para acceder a este módulo.
        </p>
        <p className="text-sm text-red-500 mt-2">
          Nivel de permiso actual: <span className="font-semibold">{permissionLevel}</span>
        </p>
      </div>
    );
  }

  // Si tiene acceso, mostrar el formulario
  return (
    <div className="space-y-6">
      {/* Indicador de nivel de permiso */}
      <div className={`p-4 rounded-lg border ${
        canWrite 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-2">
          {canWrite ? (
            <>
              <Edit className="text-green-600" size={20} />
              <span className="text-green-800 font-medium">
                Modo: Escritura Total
              </span>
            </>
          ) : (
            <>
              <Eye className="text-yellow-600" size={20} />
              <span className="text-yellow-800 font-medium">
                Modo: Solo Lectura
              </span>
            </>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Nivel de permiso: <span className="font-semibold">{permissionLevel}</span>
        </p>
      </div>

      {/* Formulario de ejemplo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Formulario de Trabajo Modificado
        </h2>

        <div className="space-y-4">
          {/* Campo de ejemplo - Siempre visible si tiene lectura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Trabajador
            </label>
            <input
              type="text"
              placeholder="Ingrese el nombre..."
              disabled={!canWrite} // Deshabilitado si solo tiene lectura
              className={`
                w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2
                ${!canWrite 
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                  : 'bg-white text-gray-900 border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                }
              `}
            />
            {!canWrite && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Eye size={12} />
                Solo lectura - No puedes editar este campo
              </p>
            )}
          </div>

          {/* Otro campo de ejemplo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diagnóstico
            </label>
            <textarea
              placeholder="Ingrese el diagnóstico..."
              disabled={!canWrite} // Deshabilitado si solo tiene lectura
              rows={4}
              className={`
                w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none
                ${!canWrite 
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                  : 'bg-white text-gray-900 border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                }
              `}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3 pt-4">
            {/* Botón Guardar - Deshabilitado si solo tiene lectura */}
            <button
              type="button"
              disabled={!canWrite}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${canWrite
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Save size={18} />
              Guardar Cambios
            </button>

            {/* Botón Cancelar - Siempre habilitado */}
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>

            {/* Mensaje si no puede escribir */}
            {!canWrite && (
              <div className="flex items-center gap-2 text-sm text-gray-500 ml-auto">
                <Lock size={14} />
                <span>No tienes permiso para guardar cambios</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información de debugging (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono">
          <p><strong>canRead:</strong> {canRead ? 'true' : 'false'}</p>
          <p><strong>canWrite:</strong> {canWrite ? 'true' : 'false'}</p>
          <p><strong>permissionLevel:</strong> {permissionLevel}</p>
          <p><strong>isLoading:</strong> {isLoading ? 'true' : 'false'}</p>
        </div>
      )}
    </div>
  );
}

