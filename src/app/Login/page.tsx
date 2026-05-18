'use client';

import React, { useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (session) {
      // Redirect based on user role
      if (session.user?.email === 'admin@ticketnow.com') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  }, [session, status, router]);

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Bienvenido a TicketNow
          </CardTitle>
          <CardDescription className="text-slate-400">
            Inicia sesión para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGoogleSignIn}
            className="w-full bg-white text-slate-900 hover:bg-slate-100 transition-colors"
            size="lg"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Al continuar, aceptas nuestros{' '}
              <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">
                términos y condiciones
              </a>
            </p>
          </div>

          <div className="mt-6 p-4 bg-slate-800 rounded-lg">
            <h4 className="text-sm font-medium text-white mb-2">¿Eres administrador?</h4>
            <p className="text-xs text-slate-400">
              Usa la cuenta <span className="text-violet-400 font-mono">admin@ticketnow.com</span> para acceder al panel de administración.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
