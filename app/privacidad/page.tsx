/**
 * Página de Política de Privacidad - Ley 29733
 * 
 * Política de privacidad y protección de datos personales
 * según la Ley 29733 del Perú
 * 
 * @module app/privacidad/page
 */

'use client';

import React from 'react';
import { Shield, FileText, Lock, Eye, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PoliticaPrivacidad() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Encabezado */}
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Shield className="text-indigo-600" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Política de Privacidad</h1>
              <p className="text-gray-600 mt-1">Ley 29733 - Protección de Datos Personales del Perú</p>
            </div>
          </div>

          {/* Contenido */}
          <div className="prose prose-slate max-w-none space-y-8">
            {/* 1. Información General */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={24} />
                1. Información General
              </h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  <strong>SERVYSALUD LF EIRL</strong> (en adelante, "la Empresa") se compromete a proteger 
                  la privacidad y los datos personales de sus usuarios, trabajadores y clientes, de conformidad 
                  con la <strong>Ley 29733 - Ley de Protección de Datos Personales del Perú</strong> y su 
                  Reglamento aprobado por Decreto Supremo N° 003-2013-JUS.
                </p>
                <p>
                  Esta política describe cómo recopilamos, utilizamos, almacenamos y protegemos sus datos personales.
                </p>
              </div>
            </section>

            {/* 2. Responsable del Tratamiento */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock size={24} />
                2. Responsable del Tratamiento
              </h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  <strong>Razón Social:</strong> SERVYSALUD LF EIRL<br />
                  <strong>RUC:</strong> [Tu RUC]<br />
                  <strong>Dirección:</strong> [Tu Dirección]<br />
                  <strong>Email:</strong> [Tu Email]<br />
                  <strong>Teléfono:</strong> [Tu Teléfono]
                </p>
              </div>
            </section>

            {/* 3. Datos Personales Recopilados */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Eye size={24} />
                3. Datos Personales Recopilados
              </h2>
              <div className="text-gray-700 space-y-3">
                <p>Recopilamos los siguientes tipos de datos personales:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Datos de Identificación:</strong> Nombres, apellidos, DNI, fecha de nacimiento</li>
                  <li><strong>Datos de Contacto:</strong> Dirección, teléfono, correo electrónico</li>
                  <li><strong>Datos Laborales:</strong> Empresa, puesto de trabajo, área</li>
                  <li><strong>Datos de Salud:</strong> Exámenes médicos, diagnósticos, restricciones laborales</li>
                  <li><strong>Datos Biométricos:</strong> Signos vitales, resultados de exámenes médicos</li>
                </ul>
              </div>
            </section>

            {/* 4. Finalidad del Tratamiento */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Finalidad del Tratamiento</h2>
              <div className="text-gray-700 space-y-3">
                <p>Utilizamos sus datos personales para las siguientes finalidades:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Vigilancia médica ocupacional</li>
                  <li>Evaluación de aptitud laboral</li>
                  <li>Gestión de casos de trabajo modificado</li>
                  <li>Cumplimiento normativo (Ley 29783 - SST)</li>
                  <li>Generación de reportes estadísticos</li>
                  <li>Comunicación con entidades de salud</li>
                </ul>
              </div>
            </section>

            {/* 5. Base Legal */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Base Legal</h2>
              <div className="text-gray-700 space-y-3">
                <p>El tratamiento de sus datos personales se basa en:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Consentimiento expreso del titular</li>
                  <li>Cumplimiento de obligaciones legales (Ley 29783 - SST)</li>
                  <li>Ejecución de contrato</li>
                  <li>Interés legítimo del responsable</li>
                </ul>
              </div>
            </section>

            {/* 6. Derechos ARCOPPP */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 size={24} />
                6. Derechos del Titular (ARCOPPP)
              </h2>
              <div className="text-gray-700 space-y-3">
                <p>Usted tiene derecho a:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Acceso:</strong> Conocer qué datos personales tenemos sobre usted</li>
                  <li><strong>Rectificación:</strong> Solicitar la corrección de datos inexactos</li>
                  <li><strong>Cancelación:</strong> Solicitar la eliminación de sus datos personales</li>
                  <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos</li>
                  <li><strong>Portabilidad:</strong> Recibir sus datos en formato estructurado</li>
                  <li><strong>Revocación:</strong> Revocar su consentimiento en cualquier momento</li>
                </ul>
                <p className="mt-4">
                  Para ejercer sus derechos, puede contactarnos en: <strong>[Tu Email]</strong>
                </p>
              </div>
            </section>

            {/* 7. Conservación de Datos */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Conservación de Datos</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  Conservaremos sus datos personales durante el tiempo necesario para cumplir con las 
                  finalidades indicadas y las obligaciones legales aplicables. Los datos de salud se 
                  conservarán según lo establecido en la normativa de salud ocupacional.
                </p>
              </div>
            </section>

            {/* 8. Seguridad */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Medidas de Seguridad</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  Implementamos medidas técnicas y organizativas apropiadas para proteger sus datos 
                  personales contra acceso no autorizado, pérdida, destrucción o alteración.
                </p>
              </div>
            </section>

            {/* 9. Transferencias */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Transferencias de Datos</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  No transferimos sus datos personales a terceros, excepto cuando sea necesario para 
                  cumplir con obligaciones legales o cuando usted haya dado su consentimiento expreso.
                </p>
              </div>
            </section>

            {/* 10. Contacto */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contacto</h2>
              <div className="text-gray-700 space-y-3">
                <p>
                  Para cualquier consulta sobre esta política o el tratamiento de sus datos personales, 
                  puede contactarnos en:
                </p>
                <p>
                  <strong>Email:</strong> [Tu Email]<br />
                  <strong>Teléfono:</strong> [Tu Teléfono]<br />
                  <strong>Dirección:</strong> [Tu Dirección]
                </p>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Última actualización: {new Date().toLocaleDateString('es-PE', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <div className="mt-4 text-center">
                <Link 
                  href="/"
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  ← Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

