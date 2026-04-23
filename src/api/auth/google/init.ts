import { initiateGoogleAuth } from '@/lib/google-auth';

export async function POST() {
  try {
    const { authUrl } = await initiateGoogleAuth();
    
    return Response.json({ authUrl });
  } catch (error) {
    console.error('Error al iniciar Google Auth:', error);
    return Response.json(
      { error: 'Error al iniciar autenticación con Google' },
      { status: 500 }
    );
  }
}
