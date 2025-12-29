/**
 * CompanySelector - Selector de empresa activa
 * 
 * Permite cambiar entre las empresas del usuario
 * 
 * @component
 */

'use client';

import React, { useState } from 'react';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { useNavigation } from '../contexts/NavigationContext';

export default function CompanySelector() {
  const { empresas, empresaActiva, setEmpresaActiva, isLoading } = useCompany();
  const { setCurrentView } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectEmpresa = (empresa: typeof empresaActiva) => {
    if (empresa) {
      setEmpresaActiva(empresa);
    }
    setIsOpen(false);
  };

  const handleGestionarEmpresas = () => {
    setCurrentView('GESTION_EMPRESAS');
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        Cargando empresas...
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <button
        onClick={handleGestionarEmpresas}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Plus size={16} />
        <span>Agregar Empresa</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Building2 size={16} className="text-gray-600 dark:text-gray-400" />
        <span className="max-w-[150px] truncate">
          {empresaActiva?.nombre || 'Sin empresa'}
        </span>
        <ChevronDown size={16} className={`text-gray-600 dark:text-gray-400 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer click fuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Empresas
              </div>
              
              {empresas.map((empresa) => (
                <button
                  key={empresa.id}
                  onClick={() => handleSelectEmpresa(empresa)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors
                    ${empresaActiva?.id === empresa.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Building2 size={16} className={empresaActiva?.id === empresa.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'} />
                    <span className="truncate">{empresa.nombre}</span>
                  </div>
                  {empresaActiva?.id === empresa.id && (
                    <Check size={16} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  )}
                </button>
              ))}
              
              <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                <button
                  onClick={handleGestionarEmpresas}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  <span>Gestionar Empresas</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

