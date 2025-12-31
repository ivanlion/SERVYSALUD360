/**
 * GestionEmpresas - Gestión CRUD de empresas
 * 
 * Permite crear, editar y eliminar empresas para el usuario actual
 * 
 * @component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Save, X, CheckCircle2, Search, Loader2 } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { useNotifications } from '../contexts/NotificationContext';
import { logger } from '../utils/logger';

export default function GestionEmpresas() {
  const { empresas, empresaActiva, addEmpresa, updateEmpresa, deleteEmpresa, setEmpresaActiva, isLoading } = useCompany();
  const { showSuccess, showError, showWarning } = useNotifications();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState<'ruc' | 'form'>('ruc'); // Paso 1: RUC, Paso 2: Formulario completo
  const [isSearchingRuc, setIsSearchingRuc] = useState(false);
  const [rucError, setRucError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: '',
    email: '',
    nombreComercial: '',
    actividadesEconomicas: '',
  });

  const handleCreate = async () => {
    if (!formData.nombre.trim()) {
      showError('El nombre de la empresa es requerido');
      return;
    }

    try {
      const nuevaEmpresa = await addEmpresa({
        nombre: formData.nombre.trim(),
        ruc: formData.ruc.trim() || undefined,
        direccion: formData.direccion.trim() || undefined,
        telefono: formData.telefono.trim() || undefined,
        email: formData.email.trim() || undefined,
        nombreComercial: formData.nombreComercial.trim() || undefined,
        actividadesEconomicas: formData.actividadesEconomicas.trim() || undefined,
        activa: true,
      });

      if (nuevaEmpresa) {
        showSuccess('Empresa creada exitosamente');
        setIsCreating(false);
        setStep('ruc');
        setFormData({ nombre: '', ruc: '', direccion: '', telefono: '', email: '', nombreComercial: '', actividadesEconomicas: '' });
        setRucError(null);
      } else {
        showError('Error al crear la empresa. Por favor, intenta nuevamente.');
      }
    } catch (error: any) {
      // Manejar error de RUC duplicado u otros errores
      const errorMessage = error.message || 'Error al crear la empresa. Por favor, intenta nuevamente.';
      
      // Si es un error de RUC duplicado, mostrar mensaje amigable
      if (errorMessage.includes('ya se encuentra registrada')) {
        showError('Esta empresa ya se encuentra registrada en el sistema. Por favor, verifica el RUC o selecciona la empresa existente.');
      } else {
        showError(errorMessage);
      }
      
      logger.error(error instanceof Error ? error : new Error(errorMessage), {
        context: 'handleCreate',
        formData: { ...formData, ruc: formData.ruc ? '***' : undefined } // No loguear RUC completo por seguridad
      });
    }
  };

  const handleEdit = (empresa: typeof empresas[0]) => {
    setEditingId(empresa.id);
    setFormData({
      nombre: empresa.nombre,
      ruc: empresa.ruc || '',
      direccion: empresa.direccion || '',
      telefono: empresa.telefono || '',
      email: empresa.email || '',
      nombreComercial: (empresa as any).nombreComercial || '',
      actividadesEconomicas: (empresa as any).actividadesEconomicas || '',
    });
  };

  const handleUpdate = async (id: string) => {
    if (!formData.nombre.trim()) {
      showError('El nombre de la empresa es requerido');
      return;
    }

    // VALIDACIÓN: Verificar si el RUC ya existe en otra empresa (solo si se está editando el RUC)
    if (formData.ruc && formData.ruc.trim()) {
      const rucLimpio = formData.ruc.trim();
      const empresaActual = empresas.find(e => e.id === id);
      
      // Solo validar si el RUC cambió o si la empresa actual no tiene RUC
      if (!empresaActual?.ruc || empresaActual.ruc !== rucLimpio) {
        const empresaConMismoRuc = empresas.find(e => e.id !== id && e.ruc === rucLimpio);
        if (empresaConMismoRuc) {
          showError(`Ya existe otra empresa con el RUC ${rucLimpio}.\n\nEmpresa existente: ${empresaConMismoRuc.nombre}`);
          return;
        }
      }
    }

    const success = await updateEmpresa(id, {
      nombre: formData.nombre.trim(),
      ruc: formData.ruc.trim() || undefined,
      direccion: formData.direccion.trim() || undefined,
      telefono: formData.telefono.trim() || undefined,
      email: formData.email.trim() || undefined,
      nombreComercial: formData.nombreComercial.trim() || undefined,
      actividadesEconomicas: formData.actividadesEconomicas.trim() || undefined,
    });

    if (success) {
      showSuccess('Empresa actualizada exitosamente');
      setEditingId(null);
      setFormData({ nombre: '', ruc: '', direccion: '', telefono: '', email: '', nombreComercial: '', actividadesEconomicas: '' });
      setStep('ruc');
      setRucError(null);
    } else {
      showError('Error al actualizar la empresa. Por favor, intenta nuevamente.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta empresa? Esta acción no se puede deshacer.')) {
      return;
    }

      const success = await deleteEmpresa(id);
      if (success) {
        showSuccess('Empresa eliminada exitosamente');
      } else {
        showError('Error al eliminar la empresa. Por favor, intenta nuevamente.');
      }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setStep('ruc');
    setFormData({ nombre: '', ruc: '', direccion: '', telefono: '', email: '', nombreComercial: '', actividadesEconomicas: '' });
    setRucError(null);
  };

  // Función para consultar RUC en SUNAT
  const consultarRUC = async (ruc: string) => {
    if (!ruc || ruc.trim().length !== 11) {
      setRucError('El RUC debe tener 11 dígitos');
      return;
    }

    setIsSearchingRuc(true);
    setRucError(null);

    try {
      const response = await fetch('/api/consultar-ruc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ruc: ruc.trim() }),
      });

      const result = await response.json();

      if (result.success && result.data && result.data.razonSocial) {
        // Construir texto de actividades económicas
        let actividadesTexto = '';
        if (result.data.actividadesEconomicas) {
          const actividades = result.data.actividadesEconomicas;
          if (actividades.principal) {
            actividadesTexto = `Principal: ${actividades.principal}`;
          }
          if (actividades.secundarias && actividades.secundarias.length > 0) {
            actividadesTexto += actividadesTexto ? '\n' : '';
            actividadesTexto += actividades.secundarias.map((sec: string, idx: number) => 
              `Secundaria ${idx + 1}: ${sec}`
            ).join('\n');
          }
        }

        // Autocompletar formulario con datos de SUNAT
        setFormData({
          nombre: result.data.razonSocial || '',
          ruc: result.data.ruc || ruc.trim(),
          direccion: result.data.direccion || '',
          telefono: result.data.telefono || '',
          email: result.data.email || '',
          nombreComercial: result.data.nombreComercial || '',
          actividadesEconomicas: actividadesTexto,
        });
        
        // Avanzar al formulario completo
        setStep('form');
        setRucError(null); // Limpiar cualquier error previo
        console.log('[GestionEmpresas] ✅ Datos obtenidos de SUNAT:', result.data);
      } else {
        // Si no se pudo obtener automáticamente, permitir continuar manualmente
        setFormData({
          nombre: '',
          ruc: ruc.trim(),
          direccion: '',
          telefono: '',
          email: '',
          nombreComercial: '',
          actividadesEconomicas: '',
        });
        setStep('form');
        // Mostrar mensaje informativo
        const mensaje = result.message || 'No se encontraron datos automáticos para este RUC. Por favor, complete los datos manualmente.';
        setRucError(mensaje);
        console.warn('[GestionEmpresas] ⚠️', mensaje);
        // Limpiar el mensaje después de 8 segundos
        setTimeout(() => setRucError(null), 8000);
      }
    } catch (error: any) {
      console.error('[GestionEmpresas] Error al consultar RUC:', error);
      setRucError('Error al consultar RUC. Puedes continuar completando los datos manualmente.');
      // Permitir continuar manualmente
      setFormData({
        nombre: '',
        ruc: ruc.trim(),
        direccion: '',
        telefono: '',
        email: '',
        nombreComercial: '',
        actividadesEconomicas: '',
      });
      setStep('form');
    } finally {
      setIsSearchingRuc(false);
    }
  };

  // Función helper para limpiar RUC (solo números)
  const limpiarRUC = (ruc: string): string => {
    return ruc.replace(/[^0-9]/g, '');
  };

  // Manejar cambio de RUC con búsqueda automática
  const handleRucChange = (ruc: string) => {
    setFormData({ ...formData, ruc });
    setRucError(null);
  };

  // Efecto para búsqueda automática cuando RUC tiene 11 dígitos
  useEffect(() => {
    const rucLimpio = limpiarRUC(formData.ruc);
    
    if (rucLimpio.length === 11 && step === 'ruc') {
      // Esperar un momento antes de buscar (debounce)
      const timeoutId = setTimeout(() => {
        consultarRUC(rucLimpio);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData.ruc, step]);

  // Cuando se inicia la creación, mostrar solo campo RUC
  useEffect(() => {
    if (isCreating && !editingId) {
      setStep('ruc');
      setFormData({ nombre: '', ruc: '', direccion: '', telefono: '', email: '', nombreComercial: '', actividadesEconomicas: '' });
      setRucError(null);
    } else if (editingId) {
      setStep('form'); // En edición, mostrar formulario completo
    }
  }, [isCreating, editingId]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Building2 className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gestión de Empresas</h2>
              <p className="text-sm text-gray-500">Administra las empresas asociadas a tu cuenta</p>
            </div>
          </div>
          {!isCreating && !editingId && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={18} />
              <span>Agregar Empresa</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulario de Creación/Edición */}
      {(isCreating || editingId) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isCreating ? 'Nueva Empresa' : 'Editar Empresa'}
          </h3>
          
          {/* Paso 1: Solo RUC (solo para creación) */}
          {isCreating && step === 'ruc' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RUC <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.ruc}
                    onChange={(e) => handleRucChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && limpiarRUC(formData.ruc).length === 11) {
                        consultarRUC(formData.ruc);
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: 20100070970"
                    maxLength={11}
                    disabled={isSearchingRuc}
                  />
                  <button
                    onClick={() => consultarRUC(formData.ruc)}
                    disabled={isSearchingRuc || limpiarRUC(formData.ruc).length !== 11}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSearchingRuc ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Buscando...</span>
                      </>
                    ) : (
                      <>
                        <Search size={18} />
                        <span>Buscar</span>
                      </>
                    )}
                  </button>
                </div>
                {rucError && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">{rucError}</p>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Ingresa el RUC de 11 dígitos. Se buscará automáticamente en SUNAT.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Formulario completo */}
          {(step === 'form' || editingId) && (
            <div className="space-y-4">
              {/* Mostrar mensaje informativo si hay un error de RUC */}
              {rucError && step === 'form' && !editingId && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">{rucError}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ej: Antamina S.A."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RUC
                  </label>
                  <input
                    type="text"
                    value={formData.ruc}
                    onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: 20100070970"
                    maxLength={11}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: +51 999 999 999"
                  />
                </div>
              </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ej: Av. Principal 123, Lima"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ej: contacto@empresa.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Comercial
              </label>
              <input
                type="text"
                value={formData.nombreComercial}
                onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ej: SERVYSALUD LF"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actividades Económicas
              </label>
              <textarea
                value={formData.actividadesEconomicas}
                onChange={(e) => setFormData({ ...formData, actividadesEconomicas: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Principal: 8690 - OTRAS ACTIVIDADES DE ATENCIÓN DE LA SALUD HUMANA&#10;Secundaria 1: 4772 - VENTA AL POR MENOR..."
                rows={4}
              />
              <p className="mt-1 text-xs text-gray-500">
                Se autocompletará automáticamente desde SUNAT. Puede editarse manualmente.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => isCreating ? handleCreate() : editingId && handleUpdate(editingId)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Save size={18} />
                <span>{isCreating ? 'Crear' : 'Guardar'}</span>
              </button>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Lista de Empresas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Mis Empresas</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-500">Cargando empresas...</p>
            </div>
          ) : empresas.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Building2 size={48} className="mx-auto mb-4 opacity-50" />
              <p>No tienes empresas registradas</p>
              <p className="text-sm mt-2">Haz clic en "Agregar Empresa" para comenzar</p>
            </div>
          ) : (
            empresas.map((empresa) => (
              <div
                key={empresa.id}
                className={
                  empresaActiva?.id === empresa.id
                    ? 'p-6 hover:bg-gray-50 transition-colors bg-indigo-50 border-l-4 border-indigo-600'
                    : 'p-6 hover:bg-gray-50 transition-colors'
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 size={20} className="text-indigo-600" />
                      <h4 className="text-lg font-semibold text-gray-900">{empresa.nombre}</h4>
                      {empresaActiva?.id === empresa.id && (
                        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                          Activa
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 ml-8">
                      {empresa.ruc && (
                        <div>
                          <span className="font-medium">RUC:</span> {empresa.ruc}
                        </div>
                      )}
                      {empresa.telefono && (
                        <div>
                          <span className="font-medium">Teléfono:</span> {empresa.telefono}
                        </div>
                      )}
                      {empresa.email && (
                        <div>
                          <span className="font-medium">Email:</span> {empresa.email}
                        </div>
                      )}
                      {empresa.direccion && (
                        <div>
                          <span className="font-medium">Dirección:</span> {empresa.direccion}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {empresaActiva?.id !== empresa.id && (
                      <button
                        onClick={() => setEmpresaActiva(empresa)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Activar empresa"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                    {editingId !== empresa.id && (
                      <>
                        <button
                          onClick={() => handleEdit(empresa)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(empresa.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

