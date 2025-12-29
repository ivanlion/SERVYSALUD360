/**
 * Componente para mostrar resultados del análisis de EMOs
 * 
 * Muestra los resultados estructurados del análisis con IA
 * 
 * @component
 */

'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Eye, 
  Ear, 
  Heart, 
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AnalisisResult {
  archivo: string;
  aptitud: string;
  restricciones: {
    lentes: string;
    altura: string;
    electricidad: string;
  };
  restriccionesCount: number;
  hallazgos: string[];
  espirometria?: {
    conclusion?: string;
    fvc?: string;
    fev1?: string;
  };
  audiometria?: {
    diagnostico?: string;
  };
  signosVitales?: {
    pa_sistolica?: string;
    pa_diastolica?: string;
    fc?: string;
    satO2?: string;
    peso?: string;
    talla?: string;
    imc?: string;
  };
  agudezaVisual?: {
    od_sc?: string;
    oi_sc?: string;
    od_cc?: string;
    oi_cc?: string;
    colores?: string;
    profundidad?: string;
  };
  antecedentes?: {
    personales?: string;
    familiares?: string;
    habitos_nocivos?: string;
  };
  datosCompletos: any;
  error?: string;
  confianza?: number;
}

interface ResultadosAnalisisProps {
  data: AnalisisResult[];
}

export default function ResultadosAnalisis({ data }: ResultadosAnalisisProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const getAptitudColor = (aptitud: string) => {
    const apt = aptitud.toUpperCase();
    if (apt.includes('APTO') && !apt.includes('NO')) {
      return 'text-green-600 bg-green-50';
    }
    if (apt.includes('NO APTO')) {
      return 'text-red-600 bg-red-50';
    }
    if (apt.includes('RESTRICCIONES')) {
      return 'text-yellow-600 bg-yellow-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  const getAptitudIcon = (aptitud: string) => {
    const apt = aptitud.toUpperCase();
    if (apt.includes('APTO') && !apt.includes('NO')) {
      return <CheckCircle2 className="text-green-600" size={20} />;
    }
    if (apt.includes('NO APTO')) {
      return <XCircle className="text-red-600" size={20} />;
    }
    if (apt.includes('RESTRICCIONES')) {
      return <AlertCircle className="text-yellow-600" size={20} />;
    }
    return <FileText className="text-gray-600" size={20} />;
  };

  // Calcular estadísticas
  const estadisticas = {
    total: data.length,
    exitosos: data.filter(r => !r.error).length,
    errores: data.filter(r => r.error).length,
    aptos: data.filter(r => !r.error && r.aptitud.toUpperCase().includes('APTO') && !r.aptitud.toUpperCase().includes('NO')).length,
    aptosConRestricciones: data.filter(r => !r.error && r.restriccionesCount > 0).length,
    noAptos: data.filter(r => !r.error && r.aptitud.toUpperCase().includes('NO APTO')).length
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas generales */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen del Análisis</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{estadisticas.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{estadisticas.exitosos}</div>
            <div className="text-sm text-gray-500">Exitosos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{estadisticas.errores}</div>
            <div className="text-sm text-gray-500">Errores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{estadisticas.aptos}</div>
            <div className="text-sm text-gray-500">Aptos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{estadisticas.aptosConRestricciones}</div>
            <div className="text-sm text-gray-500">Con Restricciones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{estadisticas.noAptos}</div>
            <div className="text-sm text-gray-500">No Aptos</div>
          </div>
        </div>
      </div>

      {/* Lista de resultados */}
      <div className="space-y-4">
        {data.map((resultado, index) => {
          const isExpanded = expandedItems.has(index);
          const hasError = !!resultado.error;

          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Encabezado del resultado */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getAptitudIcon(resultado.aptitud)}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {resultado.archivo}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getAptitudColor(resultado.aptitud)}`}>
                          {resultado.aptitud || 'ND'}
                        </span>
                        {resultado.restriccionesCount > 0 && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-50 text-yellow-700">
                            {resultado.restriccionesCount} restricción(es)
                          </span>
                        )}
                        {resultado.confianza && (
                          <span className="text-xs text-gray-500">
                            Confianza: {Math.round(resultado.confianza * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasError && (
                      <XCircle className="text-red-500" size={20} />
                    )}
                    {isExpanded ? (
                      <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </div>
                </div>
              </div>

              {/* Contenido expandido */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 space-y-4">
                  {hasError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800 mb-2">
                        <XCircle size={20} />
                        <span className="font-semibold">Error</span>
                      </div>
                      <p className="text-red-700">{resultado.error}</p>
                    </div>
                  ) : (
                    <>
                      {/* Restricciones */}
                      {resultado.restriccionesCount > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <AlertCircle size={18} />
                            Restricciones
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {resultado.restricciones.lentes === 'SI' && (
                              <div className="p-2 bg-yellow-50 rounded text-sm">
                                <span className="font-medium">Lentes correctores</span>
                              </div>
                            )}
                            {resultado.restricciones.altura === 'SI' && (
                              <div className="p-2 bg-yellow-50 rounded text-sm">
                                <span className="font-medium">Altura {'>'} 1.8m</span>
                              </div>
                            )}
                            {resultado.restricciones.electricidad === 'SI' && (
                              <div className="p-2 bg-yellow-50 rounded text-sm">
                                <span className="font-medium">Fibra óptica/Eléctrica</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Signos Vitales */}
                      {resultado.signosVitales && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Heart size={18} />
                            Signos Vitales
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            {resultado.signosVitales.pa_sistolica && (
                              <div>
                                <span className="text-gray-500">PA Sistólica:</span>{' '}
                                <span className="font-medium">{resultado.signosVitales.pa_sistolica} mmHg</span>
                              </div>
                            )}
                            {resultado.signosVitales.pa_diastolica && (
                              <div>
                                <span className="text-gray-500">PA Diastólica:</span>{' '}
                                <span className="font-medium">{resultado.signosVitales.pa_diastolica} mmHg</span>
                              </div>
                            )}
                            {resultado.signosVitales.fc && (
                              <div>
                                <span className="text-gray-500">FC:</span>{' '}
                                <span className="font-medium">{resultado.signosVitales.fc} bpm</span>
                              </div>
                            )}
                            {resultado.signosVitales.satO2 && (
                              <div>
                                <span className="text-gray-500">SatO2:</span>{' '}
                                <span className="font-medium">{resultado.signosVitales.satO2}%</span>
                              </div>
                            )}
                            {resultado.signosVitales.peso && (
                              <div>
                                <span className="text-gray-500">Peso:</span>{' '}
                                <span className="font-medium">{resultado.signosVitales.peso} kg</span>
                              </div>
                            )}
                            {resultado.signosVitales.talla && (
                              <div>
                                <span className="text-gray-500">Talla:</span>{' '}
                                <span className="font-medium">{resultado.signosVitales.talla} cm</span>
                              </div>
                            )}
                            {resultado.signosVitales.imc && (
                              <div>
                                <span className="text-gray-500">IMC:</span>{' '}
                                <span className="font-medium">{resultado.signosVitales.imc}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Espirometría */}
                      {resultado.espirometria && (resultado.espirometria.conclusion || resultado.espirometria.fvc || resultado.espirometria.fev1) && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Activity size={18} />
                            Espirometría
                          </h4>
                          <div className="space-y-1 text-sm">
                            {resultado.espirometria.conclusion && (
                              <div>
                                <span className="text-gray-500">Conclusión:</span>{' '}
                                <span className="font-medium">{resultado.espirometria.conclusion}</span>
                              </div>
                            )}
                            {resultado.espirometria.fvc && (
                              <div>
                                <span className="text-gray-500">FVC:</span>{' '}
                                <span className="font-medium">{resultado.espirometria.fvc}</span>
                              </div>
                            )}
                            {resultado.espirometria.fev1 && (
                              <div>
                                <span className="text-gray-500">FEV1:</span>{' '}
                                <span className="font-medium">{resultado.espirometria.fev1}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Audiometría */}
                      {resultado.audiometria?.diagnostico && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Ear size={18} />
                            Audiometría
                          </h4>
                          <div className="text-sm">
                            <span className="text-gray-500">Diagnóstico:</span>{' '}
                            <span className="font-medium">{resultado.audiometria.diagnostico}</span>
                          </div>
                        </div>
                      )}

                      {/* Agudeza Visual */}
                      {resultado.agudezaVisual && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Eye size={18} />
                            Agudeza Visual
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            {resultado.agudezaVisual.od_sc && (
                              <div>
                                <span className="text-gray-500">OD SC:</span>{' '}
                                <span className="font-medium">{resultado.agudezaVisual.od_sc}</span>
                              </div>
                            )}
                            {resultado.agudezaVisual.oi_sc && (
                              <div>
                                <span className="text-gray-500">OI SC:</span>{' '}
                                <span className="font-medium">{resultado.agudezaVisual.oi_sc}</span>
                              </div>
                            )}
                            {resultado.agudezaVisual.od_cc && (
                              <div>
                                <span className="text-gray-500">OD CC:</span>{' '}
                                <span className="font-medium">{resultado.agudezaVisual.od_cc}</span>
                              </div>
                            )}
                            {resultado.agudezaVisual.oi_cc && (
                              <div>
                                <span className="text-gray-500">OI CC:</span>{' '}
                                <span className="font-medium">{resultado.agudezaVisual.oi_cc}</span>
                              </div>
                            )}
                            {resultado.agudezaVisual.colores && (
                              <div>
                                <span className="text-gray-500">Colores:</span>{' '}
                                <span className="font-medium">{resultado.agudezaVisual.colores}</span>
                              </div>
                            )}
                            {resultado.agudezaVisual.profundidad && (
                              <div>
                                <span className="text-gray-500">Profundidad:</span>{' '}
                                <span className="font-medium">{resultado.agudezaVisual.profundidad}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Antecedentes */}
                      {resultado.antecedentes && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Antecedentes</h4>
                          <div className="space-y-1 text-sm">
                            {resultado.antecedentes.personales && (
                              <div>
                                <span className="text-gray-500">Personales:</span>{' '}
                                <span className="font-medium">{resultado.antecedentes.personales}</span>
                              </div>
                            )}
                            {resultado.antecedentes.familiares && (
                              <div>
                                <span className="text-gray-500">Familiares:</span>{' '}
                                <span className="font-medium">{resultado.antecedentes.familiares}</span>
                              </div>
                            )}
                            {resultado.antecedentes.habitos_nocivos && (
                              <div>
                                <span className="text-gray-500">Hábitos Nocivos:</span>{' '}
                                <span className="font-medium">{resultado.antecedentes.habitos_nocivos}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hallazgos */}
                      {resultado.hallazgos.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Hallazgos Principales</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {resultado.hallazgos.map((hallazgo, idx) => (
                              <li key={idx}>{hallazgo}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

