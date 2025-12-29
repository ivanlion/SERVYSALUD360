/**
 * GlobalChat - Chat IA siempre visible en todas las páginas
 * 
 * Componente flotante que permite acceder al asistente IA desde cualquier página
 * 
 * @component
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useChat } from '../contexts/ChatContext';
import { logger } from '@/utils/logger';

export default function GlobalChat() {
  const { isChatOpen, toggleChat, closeChat } = useChat();
  const [userPrompt, setUserPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const geminiModelRef = useRef<any>(null);

  // Inicializar Gemini
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      geminiModelRef.current = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // Mensaje de bienvenida
      setMessages([{
        role: 'assistant',
        content: '¡Hola! Soy tu asistente de salud ocupacional. ¿En qué puedo ayudarte hoy?'
      }]);
    }
  }, []);

  // Scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!userPrompt.trim() || isLoading || !geminiModelRef.current) return;

    const prompt = userPrompt.trim();
    setUserPrompt('');
    setIsLoading(true);

    // Agregar mensaje del usuario
    const userMessage = { role: 'user' as const, content: prompt };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Llamar a Gemini
      const result = await geminiModelRef.current.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Agregar respuesta del asistente
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: text
      }]);
    } catch (error: any) {
      logger.error(error instanceof Error ? error : new Error('Error al obtener respuesta'), {
        context: 'GlobalChat'
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Lo siento, hubo un error al procesar tu consulta: ${error.message || 'Error desconocido'}. Por favor, intenta nuevamente.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isChatOpen) {
    // Botón flotante para abrir chat
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-110"
        aria-label="Abrir chat de asistente IA"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div className={`
      fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl border border-gray-200
      flex flex-col transition-all duration-300
      ${isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-indigo-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} />
          <span className="font-semibold">Asistente IA</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-indigo-700 rounded transition-colors"
            aria-label={isMinimized ? 'Maximizar' : 'Minimizar'}
          >
            {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
          </button>
          <button
            onClick={closeChat}
            className="p-1 hover:bg-indigo-700 rounded transition-colors"
            aria-label="Cerrar chat"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[80%] rounded-lg p-3
                    ${message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                    }
                  `}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="animate-spin text-indigo-600" size={20} />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta..."
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!userPrompt.trim() || isLoading}
                className={`
                  px-4 py-2 bg-indigo-600 text-white rounded-lg
                  hover:bg-indigo-700 transition-colors
                  disabled:bg-gray-300 disabled:cursor-not-allowed
                  flex items-center gap-2
                `}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

