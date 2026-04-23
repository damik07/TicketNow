'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Procesando autenticación...');

  useEffect(() => {
    if (!searchParams) {
      setStatus('error');
      setMessage('Parámetros de búsqueda no disponibles');
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage('Error al autenticar con Google');
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    if (code) {
      handleGoogleCallback(code);
    } else {
      setStatus('error');
      setMessage('Código de autorización no encontrado');
      setTimeout(() => router.push('/login'), 3000);
    }
  }, [searchParams, router]);

  const handleGoogleCallback = async (code: string) => {
    try {
      const response = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('Error en la autenticación');
      }

      const data = await response.json();
      
      // Guardar token en localStorage
      localStorage.setItem('auth_token', data.token);
      
      setStatus('success');
      setMessage('¡Autenticación exitosa! Redirigiendo...');
      
      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => router.push('/'), 2000);
    } catch (error) {
      console.error('Error en callback:', error);
      setStatus('error');
      setMessage('Error al procesar la autenticación');
      setTimeout(() => router.push('/login'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto" />
          )}
          {status === 'success' && (
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          )}
          {status === 'error' && (
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">
          {status === 'loading' && 'Procesando...'}
          {status === 'success' && '¡Éxito!'}
          {status === 'error' && 'Error'}
        </h1>
        
        <p className="text-slate-400">
          {message}
        </p>
      </div>
    </div>
  );
}
