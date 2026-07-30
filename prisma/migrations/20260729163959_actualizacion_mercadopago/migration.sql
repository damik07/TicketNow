-- AlterTable
ALTER TABLE "Organizer" ADD COLUMN     "mercadopago_access_token" TEXT,
ADD COLUMN     "mercadopago_expires_at" TIMESTAMP(3),
ADD COLUMN     "mercadopago_refresh_token" TEXT;
