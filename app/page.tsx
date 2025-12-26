/**
 * Sistema de Gestión de Salud Ocupacional
 * 
 * Página principal de la aplicación que gestiona:
 * - Dashboard de casos
 * - Formulario de registro de trabajo modificado
 * - Asistente IA con Google Gemini
 * - Análisis de PDFs médicos
 * 
 * @author Sistema de Gestión de Salud Ocupacional
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Activity,
  MessageSquare,
  Send,
  X,
  Loader2,
  FileText,
  Upload,
  Trash2,
  LogOut,
  User,
  Search,
  Bell,
  Sparkles,
  Menu,
  HelpCircle
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Dashboard from '../components/Dashboard';
import WorkModifiedDashboard from '../components/WorkModifiedDashboard';
import CaseForm from '../components/CaseForm';
import AccessManagement from '../components/AccessManagement';
import AuthGuard from '../components/AuthGuard';
import { CaseData, INITIAL_CASE, createNewReevaluation } from '../types';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { useNavigation } from '../contexts/NavigationContext';

/**
 * Datos de ejemplo para demostración (no se utilizan en producción)
 * Los datos reales se obtienen de Supabase
 */
const MOCK_CASES: CaseData[] = [
  {
    ...INITIAL_CASE,
    id: 'PO-0006-001',
    trabajadorNombre: 'Juan Perez',
    dni: '12345678',
    sexo: 'Masculino',
    jornadaLaboral: '48',
    fecha: '2023-10-25',
    status: 'ACTIVO',
    empresa: 'Antamina',
    assessment: { 
      ...INITIAL_CASE.assessment, 
      diagnosticos: [{ descripcion: 'Esguince de tobillo grado II', cie10: 'S93.4' }],
      indicacionInicio: '2023-10-26',
      indicacionDuracion: '15',
      deambulacion: { value: 'O', detail: 'Solo tramos cortos' },
      trabajosAltura: { value: 'NO APTO', detail: 'Riesgo de caida' },
      alertaFarmacologica: 'SIN_EFECTO',
      lateralidad: 'Derecha',
      medicoNombre: 'Dr. House'
    },
    assessment2: { ...INITIAL_CASE.assessment },
    reevaluaciones: [
      {
        id: '1',
        fecha: '2023-11-10',
        tipo: 'CONTINUACION',
        diasAdicionales: 7,
        totalDias: 22,
        comentarios: 'Persiste dolor leve.',
        esEspecialidad: false,
        nombreEspecialista: ''
      }
    ]
  },
  {
    ...INITIAL_CASE,
    id: 'PO-0006-002',
    trabajadorNombre: 'Maria Rodriguez',
    dni: '87654321',
    sexo: 'Femenino',
    jornadaLaboral: '40',
    fecha: '2023-10-20',
    status: 'CERRADO',
    empresa: 'Constructora XYZ',
    assessment: { 
      ...INITIAL_CASE.assessment, 
      diagnosticos: [{ descripcion: 'Lumbalgia mecanica', cie10: 'M54.5' }],
      indicacionInicio: '2023-10-21',
      indicacionDuracion: '7',
      levantamientoSuelo: { value: 'N', detail: '< 3 Kg (Sedentario/Papelería)' },
      sedestacion: { value: 'F', detail: '' },
      alertaFarmacologica: 'CON_EFECTO',
      lateralidad: 'Bilateral',
      medicoNombre: 'Dr. Strange'
    },
    assessment2: { ...INITIAL_CASE.assessment },
    reevaluaciones: []
  },
  {
    ...INITIAL_CASE,
    id: 'PO-0006-003',
    trabajadorNombre: 'Carlos Lopez',
    dni: '45678912',
    sexo: 'Masculino',
    jornadaLaboral: '12',
    fecha: '2023-11-05',
    status: 'ACTIVO',
    empresa: 'Antamina',
    assessment: { 
      ...INITIAL_CASE.assessment, 
      diagnosticos: [{ descripcion: 'Contusión en mano derecha', cie10: 'S60.0' }],
      indicacionInicio: '2023-11-06',
      indicacionDuracion: '10',
      motricidadFina: { value: 'O', detail: '' },
      agarreFuerza: { value: 'N', detail: '' },
      alertaFarmacologica: 'SIN_EFECTO',
      lateralidad: 'Derecha',
      medicoNombre: 'Dr. Who'
    },
    assessment2: { ...INITIAL_CASE.assessment },
    reevaluaciones: []
  }
];

/**
 * Tipos de vista disponibles en la aplicación
 */
type View = 'DASHBOARD' | 'NEW_CASE' | 'EDIT_CASE' | 'ACCESS_MANAGEMENT';

/**
 * Componente principal de la aplicación
 * Gestiona el estado global, navegación y el asistente IA
 */
export default function Home() {
  const router = useRouter();
  const { currentView, setCurrentView } = useNavigation();
  const [cases, setCases] = useState<CaseData[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Estados para Gemini
  const [showGeminiChat, setShowGeminiChat] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [geminiResponse, setGeminiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasWelcomed, setHasWelcomed] = useState(false);
  
  // Estados para PDF
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  
  // Referencia para el modelo de Gemini
  const geminiModelRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Obtener información del usuario autenticado
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  /**
   * Inicializa el modelo de Google Gemini AI al montar el componente
   * Configura el sistema de instrucciones para actuar como experto en salud ocupacional
   */
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('NEXT_PUBLIC_GEMINI_API_KEY no está configurada');
      return;
    }
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // Usar el modelo gemini-2.5-flash (sin prefijo models/, el SDK lo agrega automáticamente)
      geminiModelRef.current = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        systemInstruction: `Eres el Asistente Experto de Servysalud, un especialista en Salud Ocupacional y Seguridad en el Trabajo para la empresa SERVYSALUD 360.

REGLAS DE COMPORTAMIENTO:

1. SALUDO: Siempre debes saludar presentándote como "Asistente Experto de Servysalud" cuando inicies una conversación o cuando el usuario te salude.

2. BASE LEGAL: Todas tus respuestas deben estar fundamentadas en la normativa peruana de salud ocupacional, especialmente la Ley 29783 (Ley de Seguridad y Salud en el Trabajo) y su reglamento. Debes hacer referencia a esta normativa cuando sea relevante.

3. PROFESIONALISMO: Mantén un tono profesional, preciso y técnico. Sé claro y conciso en tus explicaciones, utilizando terminología apropiada del ámbito de salud ocupacional.

4. ENFOQUE PREVENTIVO: Tu objetivo principal es la prevención de riesgos laborales. Enfócate en proporcionar información que ayude a prevenir accidentes y enfermedades ocupacionales, evaluar capacidades funcionales, y promover entornos de trabajo seguros.

5. REDIRECCIÓN CORDIAL: Si el usuario te pregunta sobre temas que están fuera del ámbito médico, de salud ocupacional o seguridad laboral, debes redirigir la conversación de manera cordial y profesional, recordándole que tu especialidad es la salud ocupacional y ofreciendo ayuda en ese contexto.

6. CONTEXTO DE SERVYSALUD 360: Estás diseñado para asistir en el análisis de casos de trabajo modificado, evaluación de capacidades funcionales, análisis de puestos de trabajo, y gestión de casos de salud ocupacional.

7. EXPERTO EN SALUD OCUPACIONAL: Como experto en salud ocupacional de Servysalud, debes proporcionar orientación especializada sobre:
   - Evaluación de capacidades funcionales
   - Análisis de puestos de trabajo
   - Trabajo modificado y restricciones laborales
   - Prevención de riesgos ocupacionales
   - Normativa peruana de seguridad y salud en el trabajo
   - Gestión de casos de salud ocupacional

Recuerda siempre mantener el enfoque en la seguridad y salud de los trabajadores, siguiendo los estándares peruanos de salud ocupacional.`
      });
    } catch (error: any) {
      console.error('Error al inicializar Gemini:', error);
      // Si hay un error 404, puede ser que el modelo no esté disponible
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.warn('El modelo gemini-2.5-flash puede no estar disponible. Considera usar gemini-1.5-flash como alternativa.');
      }
    }
  }, []);

  /**
   * Envía un mensaje de bienvenida automático cuando se abre el chat por primera vez
   */
  useEffect(() => {
    if (showGeminiChat && !hasWelcomed && geminiModelRef.current && !isLoading) {
      const sendWelcomeMessage = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await geminiModelRef.current.generateContent('Hola');
          const response = await result.response;
          const text = response.text();
          setGeminiResponse(text);
          setHasWelcomed(true);
        } catch (err: any) {
          console.error('Error al enviar mensaje de bienvenida:', err);
          // No mostrar error en el saludo inicial, solo loguearlo
        } finally {
          setIsLoading(false);
        }
      };
      sendWelcomeMessage();
    }
  }, [showGeminiChat, hasWelcomed, isLoading]);

  /**
   * Maneja el guardado de un caso (crear nuevo o actualizar existente)
   * @param caseData - Datos del caso a guardar
   */
  const handleSaveCase = (caseData: CaseData) => {
    if (selectedCase) {
      // Update existing
      setCases(cases.map(c => c.id === caseData.id ? caseData : c));
    } else {
      // Create new
      const newCase = { ...caseData, id: `PO-0006-${Date.now().toString().slice(-4)}` };
      setCases([newCase, ...cases]);
    }
    setCurrentView('DASHBOARD');
    setSelectedCase(null);
  };

  /**
   * Maneja la edición de un caso existente
   * Asegura que los arrays de reevaluaciones y assessment2 existan
   * @param caseData - Datos del caso a editar
   */
  const handleEditCase = (caseData: CaseData) => {
    // If opening a new case that has no reevaluations yet, we might want to ensure the array exists
    if (!caseData.reevaluaciones) {
        caseData.reevaluaciones = [];
    }
    // Ensure assessment2 exists for older records
    if (!caseData.assessment2) {
        caseData.assessment2 = { ...INITIAL_CASE.assessment }; 
    }
    setSelectedCase(caseData);
    setCurrentView('EDIT_CASE');
  };

  const handleCreateNew = () => {
    setSelectedCase(null);
    setCurrentView('NEW_CASE');
  };

  /**
   * Maneja la apertura/cierre del panel de chat de Gemini
   * Resetea el estado de bienvenida al cerrar
   */
  const handleToggleChat = () => {
    if (showGeminiChat) {
      // Al cerrar el chat, resetear el estado de bienvenida para que se muestre de nuevo al abrir
      setHasWelcomed(false);
      setGeminiResponse('');
      setError(null);
    }
    setShowGeminiChat(!showGeminiChat);
  };

  /**
   * Envía un prompt al modelo de Gemini y muestra la respuesta
   * Maneja errores y estados de carga
   */
  const handleSendPrompt = async () => {
    if (!userPrompt.trim() || !geminiModelRef.current) {
      setError('Por favor ingresa un mensaje y asegúrate de que NEXT_PUBLIC_GEMINI_API_KEY esté configurada');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeminiResponse('');

    try {
      const result = await geminiModelRef.current.generateContent(userPrompt);
      const response = await result.response;
      const text = response.text();
      setGeminiResponse(text);
      setUserPrompt(''); // Limpiar el input después de enviar
    } catch (err: any) {
      console.error('Error al generar respuesta:', err);
      // Mensaje de error más descriptivo
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setError('Modelo no encontrado. Verifica que "gemini-2.5-flash" esté disponible en tu región. Si el problema persiste, intenta con "gemini-1.5-flash".');
      } else {
        setError(err.message || 'Error al comunicarse con Gemini. Verifica tu API key y que el modelo esté disponible.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Maneja la tecla Enter para enviar el mensaje (Shift+Enter para nueva línea)
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  /**
   * Convierte un archivo a formato base64 para enviarlo a Gemini
   * @param file - Archivo a convertir
   * @returns Promise con el string en base64
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Manejar drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files) as File[];
    const pdfFile = files.find((file: File) => file.type === 'application/pdf');
    
    if (pdfFile) {
      await handleFileUpload(pdfFile);
    } else {
      setError('Por favor, arrastra solo archivos PDF');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      await handleFileUpload(file);
    } else {
      setError('Por favor, selecciona un archivo PDF');
    }
  };

  /**
   * Procesa y analiza un archivo PDF usando Gemini AI
   * Extrae información estructurada de exámenes médicos
   * @param file - Archivo PDF a analizar
   */
  const handleFileUpload = async (file: File) => {
    if (!geminiModelRef.current) {
      setError('Gemini no está inicializado. Verifica tu API key.');
      return;
    }

    setUploadedFile(file);
    setIsLoading(true);
    setError(null);
    setGeminiResponse('');
    setExtractedData(null);

    try {
      // Convertir PDF a base64
      const base64Data = await fileToBase64(file);

      // Crear prompt para extraer datos médicos
      const analysisPrompt = `Analiza este PDF de examen médico y extrae los siguientes datos en formato JSON:

{
  "diagnosticos": [
    {
      "descripcion": "descripción del diagnóstico",
      "cie10": "código CIE-10 si está disponible"
    }
  ],
  "indicacionInicio": "fecha de inicio (formato YYYY-MM-DD)",
  "indicacionDuracion": "duración en días",
  "medicoNombre": "nombre del médico",
  "observaciones": "observaciones o comentarios relevantes",
  "restricciones": [
    "lista de restricciones o limitaciones encontradas"
  ],
  "medicamentos": [
    "lista de medicamentos si están mencionados"
  ]
}

Si algún dato no está disponible, usa una cadena vacía. Responde SOLO con el JSON válido, sin texto adicional antes o después.`;

      // Enviar a Gemini con el PDF
      const result = await geminiModelRef.current.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: 'application/pdf'
          }
        },
        { text: analysisPrompt }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Intentar parsear JSON de la respuesta
      try {
        // Limpiar el texto para extraer solo el JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedData = JSON.parse(jsonMatch[0]);
          setExtractedData(parsedData);
          setGeminiResponse(`✅ Datos extraídos del PDF:\n\n${JSON.stringify(parsedData, null, 2)}`);
        } else {
          setGeminiResponse(text);
        }
      } catch (parseError) {
        // Si no se puede parsear, mostrar la respuesta completa
        setGeminiResponse(text);
      }
    } catch (err: any) {
      console.error('Error al analizar PDF:', err);
      // Mensaje de error más descriptivo
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setError('Modelo no encontrado. Verifica que "gemini-2.5-flash" esté disponible en tu región. Si el problema persiste, intenta con "gemini-1.5-flash".');
      } else {
        setError(err.message || 'Error al analizar el PDF. Verifica que el archivo sea válido y que el modelo esté disponible.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setExtractedData(null);
    setGeminiResponse('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar - Estructura Estricta 3 Bloques */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 w-full h-16">
        <div className="flex items-center justify-between px-6 h-full">
          {/* Bloque Izquierdo - Identidad Unificada */}
          <div className="flex items-center gap-3">
            {/* 1. Botón hamburguesa */}
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu size={20} className="text-gray-600" />
            </button>
            
            {/* 2. Logo */}
            <div className="bg-blue-600 text-white p-1.5 rounded-lg flex-shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            
            {/* 3. Título Completo */}
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
              onClick={() => setCurrentView('DASHBOARD')}
            >
              <span className="font-bold text-lg text-gray-900 whitespace-nowrap">
                Sistema de Gestión de Salud Ocupacional
              </span>
            </div>
          </div>

          {/* Bloque Central - Búsqueda y Asistente (Ancho y Dominante) */}
          <div className="flex-1 max-w-3xl mx-auto flex items-center gap-2">
            {/* Barra de Búsqueda tipo píldora */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Botón Asistente IA pegado a la derecha */}
            <button
              onClick={handleToggleChat}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <Sparkles size={18} />
              <span className="hidden md:inline">Asistente IA</span>
            </button>
          </div>

          {/* Bloque Derecho - Utilidades */}
          <div className="flex items-center gap-5">
            {/* Soporte */}
            <a
              href="#"
              className="text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Soporte
            </a>

            {/* Notificaciones con badge */}
            <button
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Notificaciones"
            >
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {/* Avatar de Usuario */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center font-semibold text-white text-sm">
                  {(() => {
                    if (!user.email) return 'U';
                    const emailParts = user.email.split('@')[0];
                    const firstLetter = emailParts.charAt(0).toUpperCase();
                    const secondLetter = emailParts.length > 1 ? emailParts.charAt(1).toUpperCase() : '';
                    return firstLetter + secondLetter;
                  })()}
                </div>
                {/* Botones condicionales para Trabajo Modificado */}
                {(currentView === 'NEW_CASE' || currentView === 'EDIT_CASE') && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCreateNew}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                    >
                      <PlusCircle size={16} />
                      <span className="hidden lg:inline">Nuevo Caso</span>
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1.5"
                      title="Cerrar sesión"
                    >
                      <LogOut size={16} />
                      <span className="hidden lg:inline">Salir</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {currentView === 'DASHBOARD' && (
          <Dashboard 
            onEdit={handleEditCase} 
            onCreate={handleCreateNew}
            user={user}
          />
        )}
        {currentView === 'WORK_MODIFIED_DASHBOARD' && (
          <WorkModifiedDashboard 
            onEdit={handleEditCase} 
            onCreate={handleCreateNew}
          />
        )}
        {(currentView === 'NEW_CASE' || currentView === 'EDIT_CASE') && (
          <CaseForm 
            initialData={selectedCase || undefined} 
            onSave={handleSaveCase} 
            onCancel={() => setCurrentView('DASHBOARD')}
          />
        )}
        {currentView === 'ACCESS_MANAGEMENT' && (
          <AccessManagement />
        )}
      </main>

      {/* Chat de Gemini - Panel flotante */}
      {showGeminiChat && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-96 bg-white rounded-none sm:rounded-lg shadow-2xl border-0 sm:border border-gray-200 z-50 flex flex-col max-h-screen sm:max-h-[600px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 sm:p-4 rounded-t-none sm:rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="sm:w-5 sm:h-5" />
              <h3 className="font-bold text-base sm:text-lg">Asistente IA - Gemini</h3>
            </div>
            <button
              onClick={handleToggleChat}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Área de respuesta */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50 min-h-[200px]">
            {/* Zona de drag and drop para PDF */}
            {!uploadedFile && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  mb-4 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                  ${isDragging 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
                  }
                `}
              >
                <Upload size={24} className={`sm:w-8 sm:h-8 mx-auto mb-2 ${isDragging ? 'text-purple-600' : 'text-gray-400'}`} />
                <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Arrastra un PDF aquí o haz clic para seleccionar
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500">
                  Analiza exámenes médicos y extrae datos relevantes
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Archivo cargado */}
            {uploadedFile && (
              <div className="mb-4 bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText size={20} className="text-purple-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{uploadedFile.name}</span>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Eliminar archivo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                <p className="text-sm font-semibold">Error:</p>
                <p className="text-sm">{error}</p>
              </div>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-purple-600" size={32} />
                <span className="ml-3 text-gray-600">
                  {uploadedFile ? 'Analizando PDF...' : 'Pensando...'}
                </span>
              </div>
            ) : geminiResponse ? (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{geminiResponse}</p>
                {extractedData && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-purple-600 mb-2">💡 Datos estructurados extraídos:</p>
                    <div className="bg-purple-50 p-3 rounded text-xs space-y-2">
                      {extractedData.diagnosticos && extractedData.diagnosticos.length > 0 && (
                        <div>
                          <p className="font-semibold text-purple-700 mb-1">Diagnósticos:</p>
                          {extractedData.diagnosticos.map((diag: any, idx: number) => (
                            <p key={idx} className="text-gray-700 ml-2">
                              • {diag.descripcion} {diag.cie10 && `(CIE-10: ${diag.cie10})`}
                            </p>
                          ))}
                        </div>
                      )}
                      {extractedData.indicacionInicio && (
                        <div>
                          <p className="font-semibold text-purple-700">Fecha de inicio:</p>
                          <p className="text-gray-700 ml-2">{extractedData.indicacionInicio}</p>
                        </div>
                      )}
                      {extractedData.indicacionDuracion && (
                        <div>
                          <p className="font-semibold text-purple-700">Duración:</p>
                          <p className="text-gray-700 ml-2">{extractedData.indicacionDuracion} días</p>
                        </div>
                      )}
                      {extractedData.medicoNombre && (
                        <div>
                          <p className="font-semibold text-purple-700">Médico:</p>
                          <p className="text-gray-700 ml-2">{extractedData.medicoNombre}</p>
                        </div>
                      )}
                      {extractedData.observaciones && (
                        <div>
                          <p className="font-semibold text-purple-700">Observaciones:</p>
                          <p className="text-gray-700 ml-2">{extractedData.observaciones}</p>
                        </div>
                      )}
                      {extractedData.restricciones && extractedData.restricciones.length > 0 && (
                        <div>
                          <p className="font-semibold text-purple-700">Restricciones:</p>
                          {extractedData.restricciones.map((rest: string, idx: number) => (
                            <p key={idx} className="text-gray-700 ml-2">• {rest}</p>
                          ))}
                        </div>
                      )}
                      {(currentView === 'NEW_CASE' || currentView === 'EDIT_CASE') && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <p className="text-xs text-purple-600 italic">
                            💡 Puedes usar estos datos para completar el formulario manualmente
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Escribe tu pregunta, o arrastra un PDF para analizar</p>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-white rounded-b-none sm:rounded-b-lg">
            <div className="flex gap-2">
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta aquí..."
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={3}
                disabled={isLoading || !geminiModelRef.current}
              />
              <button
                onClick={handleSendPrompt}
                disabled={isLoading || !userPrompt.trim() || !geminiModelRef.current}
                className={`
                  px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 sm:gap-2 flex-shrink-0
                  ${isLoading || !userPrompt.trim() || !geminiModelRef.current
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg'
                  }
                `}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin w-[18px] h-[18px] sm:w-5 sm:h-5" />
                ) : (
                  <Send className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
            {!geminiModelRef.current && (
              <p className="text-[10px] sm:text-xs text-red-600 mt-2">
                ⚠️ NEXT_PUBLIC_GEMINI_API_KEY no está configurada
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-blue-100 mt-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-xs sm:text-sm text-slate-500">
            © 2025 Sistema de Gestión de Salud Ocupacional - Todos los derechos reservados
          </p>
        </div>
      </footer>
      </div>
    </AuthGuard>
  );
}
