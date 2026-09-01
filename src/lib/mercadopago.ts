// lib/mercadopago.ts
import { MercadoPagoConfig } from 'mercadopago';
import { prisma } from '@/lib/db';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';

if (!accessToken) {
  console.warn('⚠️ MERCADO_PAGO_ACCESS_TOKEN no está definido en las variables de entorno.');
}

// Instancia global del SDK de Mercado Pago
export const mpClient = new MercadoPagoConfig({
  accessToken: accessToken,
});

/**
 * Renueva el Access Token de un organizador utilizando su Refresh Token.
 */
export async function refreshOrganizerMpToken(organizerId: string): Promise<string> {
  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    select: {
      mercadopagoRefreshToken: true,
      mercadopagoAccessToken: true,
      mercadopagoExpiresAt: true,
    },
  });

  if (!organizer || !organizer.mercadopagoRefreshToken) {
    throw new Error(`El organizador ${organizerId} no posee un Refresh Token de Mercado Pago vinculado.`);
  }

  const clientId = (process.env.MERCADO_PAGO_CLIENT_ID || '').trim();
  const clientSecret = (process.env.MERCADO_PAGO_CLIENT_SECRET || process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();

  const bodyParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: organizer.mercadopagoRefreshToken,
  });

  // ⚠️ NOTA: No agregamos 'test_token: true' para asegurar que Mercado Pago devuelva 
  // tokens de Producción (APP_USR-...) que permiten generar init_point reales.

  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: bodyParams,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`[MP Token Refresh Error] Organizer: ${organizerId}`, data);
    throw new Error(data.message || 'Error al refrescar token de Mercado Pago');
  }

  const expiresInSeconds = data.expires_in || 15552000;
  const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  const updatedOrganizer = await prisma.organizer.update({
    where: { id: organizerId },
    data: {
      mercadopagoAccessToken: data.access_token,
      mercadopagoRefreshToken: data.refresh_token,
      mercadopagoExpiresAt: newExpiresAt,
      mercadopagoPublicKey: data.public_key || null,
    },
  });

  if (!updatedOrganizer.mercadopagoAccessToken) {
    throw new Error('No se pudo verificar el nuevo access_token guardado.');
  }

  return updatedOrganizer.mercadopagoAccessToken;
}

/**
 * Devuelve el access token OAuth del organizador, renovándolo si está por vencer.
 */
export async function getValidOrganizerAccessToken(organizerId: string): Promise<string> {
  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    select: {
      mercadopagoAccessToken: true,
      mercadopagoExpiresAt: true,
      mercadopagoRefreshToken: true,
    },
  });

  if (!organizer?.mercadopagoAccessToken) {
    throw new Error('El organizador no tiene Mercado Pago vinculado.');
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const expiresAt = organizer.mercadopagoExpiresAt?.getTime() ?? 0;
  const shouldRefresh =
    organizer.mercadopagoRefreshToken &&
    expiresAt > 0 &&
    expiresAt - Date.now() < oneDayMs;

  if (shouldRefresh) {
    return refreshOrganizerMpToken(organizerId);
  }

  return organizer.mercadopagoAccessToken;
}

/**
 * URL de Checkout Pro según el entorno.
 * En producción se prioriza SIEMPRE init_point.
 */
export function resolveMpCheckoutUrl(
  initPoint?: string | null,
  sandboxInitPoint?: string | null
): string | null {
  const useSandbox = process.env.NEXT_PUBLIC_MP_USE_SANDBOX_INITPOINT === 'true';
  
  if (useSandbox) {
    return sandboxInitPoint || initPoint || null;
  }
  
  // Por defecto se da prioridad estricta al punto de inicio de producción
  return initPoint || sandboxInitPoint || null;
}