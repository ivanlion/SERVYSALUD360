/**
 * Componente de Consentimiento Ley 29733
 * 
 * Formulario de consentimiento informado para el tratamiento de datos personales
 * según la Ley 29733 - Ley de Protección de Datos Personales del Perú
 * 
 * @component
 */

'use client';

import React, { useState } from 'react';
import { Shield, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

interface ConsentimientoData {
  trabajadorNombre: string;
  trabajadorDni: string;
  fecha: string;
  consentimiento: boolean;
  finalidad: string[];
  plazo: string;
  derechos: boolean;
}

export default function Ley29733Consentimiento() {
  const { showWarning, showError, showSuccess } = useNotifications();
  const [formData, setFormData] = useState<ConsentimientoData>({
    trabajadorNombre: '',
    trabajadorDni: '',
    fecha: new Date().toISOString().split('T')[0],
    consentimiento: false,
    finalidad: [],
    plazo: '5 años',
    derechos: false
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const finalidades = [
    'Vigilancia médica ocupacional',
    'Evaluación de aptitud laboral',
    'Gestión de casos de trabajo modificado',
    'Cumplimiento normativo (Ley 29783 - SST)',
    'Generación de reportes estadísticos',
    'Comunicación con entidades de salud'
  ];

  const handleFinalidadChange = (finalidad: string) => {
    setFormData(prev => ({
      ...prev,
      finalidad: prev.finalidad.includes(finalidad)
        ? prev.finalidad.filter(f => f !== finalidad)
        : [...prev.finalidad, finalidad]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.consentimiento || !formData.derechos || formData.finalidad.length === 0) {
      showWarning('Por favor, complete todos los campos requeridos y acepte los términos.');
      return;
    }

    try {
      // Aquí guardarías en Supabase
      // const { error } = await supabase
      //   .from('consentimientos_ley29733')
      //   .insert([formData]);

      console.log('Consentimiento guardado:', formData);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error al guardar consentimiento:', error);
        showError('Error al guardar el consentimiento. Por favor, intente nuevamente.');
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <CheckCircle2 className="mx-auto text-green-600" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Consentimiento Registrado</h2>
          <p className="text-gray-600 mt-2">
            El consentimiento ha sido registrado exitosamente según la Ley 29733.
          </p>
          <button
            onClick={() => {
              setIsSubmitted(false);
              setFormData({
                trabajadorNombre: '',
                trabajadorDni: '',
                fecha: new Date().toISOString().split('T')[0],
                consentimiento: false,
                finalidad: [],
                plazo: '5 años',
                derechos: false
              });
            }}
            className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Registrar Nuevo Consentimiento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Shield className="text-indigo-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Consentimiento Informado - Ley 29733</h2>
            <p className="text-sm text-gray-500">Ley de Protección de Datos Personales del Perú</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Importante:</p>
              <p>
                Según la Ley 29733, es necesario obtener el consentimiento expreso del titular 
                de los datos personales antes de realizar cualquier tratamiento de los mismos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Datos del Trabajador */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del Titular</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={formData.trabajadorNombre}
                onChange={(e) => setFormData(prev => ({ ...prev, trabajadorNombre: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DNI *
              </label>
              <input
                type="text"
                required
                value={formData.trabajadorDni}
                onChange={(e) => setFormData(prev => ({ ...prev, trabajadorDni: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={formData.fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plazo de Conservación
              </label>
              <select
                value={formData.plazo}
                onChange={(e) => setFormData(prev => ({ ...prev, plazo: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="1 año">1 año</option>
                <option value="3 años">3 años</option>
                <option value="5 años">5 años</option>
                <option value="10 años">10 años</option>
                <option value="Indefinido">Indefinido (según normativa)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Finalidad del Tratamiento */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Finalidad del Tratamiento *</h3>
          <p className="text-sm text-gray-600 mb-4">
            Seleccione las finalidades para las cuales consiente el tratamiento de sus datos personales:
          </p>
          <div className="space-y-2">
            {finalidades.map((finalidad) => (
              <label key={finalidad} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.finalidad.includes(finalidad)}
                  onChange={() => handleFinalidadChange(finalidad)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-700">{finalidad}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Consentimiento */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              required
              checked={formData.consentimiento}
              onChange={(e) => setFormData(prev => ({ ...prev, consentimiento: e.target.checked }))}
              className="mt-1"
            />
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Consentimiento para el Tratamiento de Datos Personales *</p>
              <p>
                Doy mi consentimiento expreso e informado para el tratamiento de mis datos personales 
                según las finalidades indicadas, de conformidad con la Ley 29733 - Ley de Protección 
                de Datos Personales del Perú.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              required
              checked={formData.derechos}
              onChange={(e) => setFormData(prev => ({ ...prev, derechos: e.target.checked }))}
              className="mt-1"
            />
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Conocimiento de Derechos ARCOPPP *</p>
              <p>
                He sido informado sobre mis derechos de Acceso, Rectificación, Cancelación, 
                Oposición, Portabilidad y Revocación (ARCOPPP) establecidos en la Ley 29733, 
                y sé que puedo ejercerlos en cualquier momento.
              </p>
            </div>
          </div>
        </div>

        {/* Botón de Envío */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={!formData.consentimiento || !formData.derechos || formData.finalidad.length === 0}
            className={`
              px-6 py-2 rounded-lg font-semibold transition-all
              ${(!formData.consentimiento || !formData.derechos || formData.finalidad.length === 0)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
              }
            `}
          >
            Registrar Consentimiento
          </button>
        </div>
      </form>
    </div>
  );
}

