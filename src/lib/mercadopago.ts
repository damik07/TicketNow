// lib/mercadopago.ts
import { MercadoPagoConfig } from 'mercadopago';

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';

if (!accessToken) {
  console.warn('⚠️ MERCADO_PAGO_ACCESS_TOKEN no está definido en las variables de entorno.');
}

// Instancia global del SDK de Mercado Pago
export const mpClient = new MercadoPagoConfig({
  accessToken: accessToken,
});