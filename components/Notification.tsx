'use client';

import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function Notification({ message, type, onClose, duration = 5000 }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-2 sm:right-4 left-2 sm:left-auto z-50 animate-in slide-in-from-right max-w-[calc(100vw-1rem)] sm:max-w-md">
      <div
        className={`
          flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg border-2 w-full sm:min-w-[300px]
          ${type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
          }
        `}
      >
        {type === 'success' ? (
          <CheckCircle size={24} className="text-emerald-600 flex-shrink-0" />
        ) : (
          <XCircle size={24} className="text-red-600 flex-shrink-0" />
        )}
        <p className="flex-1 font-semibold text-sm">{message}</p>
        <button
          onClick={onClose}
          className={`
            p-1 rounded hover:bg-opacity-20 transition-colors
            ${type === 'success' ? 'hover:bg-emerald-600' : 'hover:bg-red-600'}
          `}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

