import { handleGoogleCallback } from '@/lib/google-auth';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return Response.json(
        { error: 'Código de autorización no proporcionado' },
        { status: 400 }
      );
    }

    const result = await handleGoogleCallback(code);
    
    return Response.json(result);
  } catch (error) {
    console.error('Error en callback de Google:', error);
    return Response.json(
      { error: 'Error al autenticar con Google' },
      { status: 500 }
    );
  }
}
