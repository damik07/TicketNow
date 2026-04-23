import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/prisma';

// Configuración de Google OAuth
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback'
);

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

// Generar URL de autenticación de Google
export function getGoogleAuthUrl(): string {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

// Obtener información del usuario de Google
export async function getGoogleUserInfo(code: string): Promise<GoogleUserInfo> {
  try {
    // Intercambiar el código por tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Obtener información del usuario usando fetch
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }
    
    const data = await response.json();

    if (!data.id || !data.email) {
      throw new Error('Información de usuario incompleta');
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name || '',
      picture: data.picture,
      given_name: data.given_name,
      family_name: data.family_name,
    };
  } catch (error) {
    console.error('Error al obtener información de Google:', error);
    throw new Error('Error al autenticar con Google');
  }
}

// Crear o actualizar usuario en la base de datos
export async function createOrUpdateUser(googleUser: GoogleUserInfo) {
  try {
    // Buscar usuario existente por provider_id
    let user = await prisma.user.findUnique({
      where: { provider_id: googleUser.id },
    });

    if (user) {
      // Actualizar usuario existente
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: googleUser.email,
          full_name: googleUser.name,
          avatar_url: googleUser.picture,
          updatedAt: new Date(),
        },
      });
    } else {
      // Verificar si ya existe un usuario con el mismo email
      const existingUser = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingUser && existingUser.provider !== 'google') {
        throw new Error('Este email ya está registrado con otro método de autenticación');
      }

      // Crear nuevo usuario
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          full_name: googleUser.name,
          avatar_url: googleUser.picture,
          provider: 'google',
          provider_id: googleUser.id,
          role: 'user',
          active: true,
        },
      });
    }

    return user;
  } catch (error) {
    console.error('Error al crear/actualizar usuario:', error);
    throw error;
  }
}

// Generar token de sesión simple (en producción usar JWT)
function generateSessionToken(user: any): string {
  return Buffer.from(JSON.stringify({
    userId: user.id,
    email: user.email,
    timestamp: Date.now(),
  })).toString('base64');
}

// Verificar token de sesión
export async function verifySessionToken(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Verificar que el token no sea muy antiguo (24 horas)
    if (Date.now() - decoded.timestamp > 24 * 60 * 60 * 1000) {
      throw new Error('Token expirado');
    }

    // Obtener usuario actualizado de la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.active) {
      throw new Error('Usuario no encontrado o inactivo');
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url,
    };
  } catch (error) {
    console.error('Error al verificar token:', error);
    throw new Error('Token inválido');
  }
}

// Endpoint para iniciar el flujo de Google OAuth
export function initiateGoogleAuth() {
  const authUrl = getGoogleAuthUrl();
  return { authUrl };
}

// Endpoint para manejar el callback de Google
export async function handleGoogleCallback(code: string) {
  try {
    // Obtener información del usuario
    const googleUser = await getGoogleUserInfo(code);
    
    // Crear o actualizar usuario en la base de datos
    const user = await createOrUpdateUser(googleUser);

    // Generar token de sesión (aquí podrías usar JWT)
    const sessionToken = generateSessionToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
      token: sessionToken,
    };
  } catch (error) {
    console.error('Error en callback de Google:', error);
    throw error;
  }
}
