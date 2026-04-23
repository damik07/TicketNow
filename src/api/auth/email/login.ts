import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return Response.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      );
    }

    // Verificar que el usuario esté activo
    if (!user.active) {
      return Response.json(
        { error: 'Usuario inactivo' },
        { status: 401 }
      );
    }

    // Verificar contraseña (si tiene)
    if (user.password_hash) {
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return Response.json(
          { error: 'Usuario o contraseña incorrectos' },
          { status: 401 }
        );
      }
    } else {
      return Response.json(
        { error: 'Este usuario usa Google OAuth para iniciar sesión' },
        { status: 401 }
      );
    }

    // Generar token de sesión
    const token = generateSessionToken(user);

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
      token,
    });
  } catch (error) {
    console.error('Error en login con email:', error);
    return Response.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    );
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
