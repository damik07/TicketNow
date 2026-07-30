'use client';

import React, { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Estados para el formulario tradicional
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (session) {
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

  const handleFacebookSignIn = () => {
    signIn('facebook', { callbackUrl: '/' });
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor, completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: '/',
      });

      if (res?.error) {
        toast.error('Credenciales incorrectas o usuario no encontrado.');
      } else {
        toast.success('¡Sesión iniciada con éxito!');
        router.refresh();
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-xl">
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
        <CardContent className="space-y-5">

          {/* Formulario Tradicional */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-sm font-medium">
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950/60 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-violet-500 h-10"
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-950/60 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-violet-500 h-10"
                disabled={isSubmitting}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white transition-colors h-10 font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Ingresar con Email
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Divisor Visual (OR) */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800/80"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider text-slate-600">
              o continuar con
            </span>
            <div className="flex-grow border-t border-slate-800/80"></div>
          </div>


          <div className="flex flex-col gap-2">
            {/* Botón de Google */}
            <Button
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-slate-900 hover:bg-slate-100 transition-colors h-10 font-medium"
              disabled={isSubmitting}
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
              Cuenta de Google
            </Button>

            {/* Botón de Facebook */}
            <Button
              onClick={handleFacebookSignIn}
              className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white transition-colors h-10 font-medium"
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Cuenta de Facebook
            </Button>

          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              Al continuar, aceptas nuestros{' '}
              <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">
                términos y condiciones
              </a>
            </p>
          </div>

          <div className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <h4 className="text-xs font-semibold text-slate-300 mb-1">¿Eres administrador?</h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              Usa la cuenta <span className="text-violet-400 font-mono font-medium">admin@ticketnow.com</span> para acceder directamente al panel de control central.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}