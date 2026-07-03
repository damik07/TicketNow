-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "pendingDeduction" DOUBLE PRECISION,
ADD COLUMN     "pendingExpiresAt" TIMESTAMP(3),
ADD COLUMN     "pendingOperatorId" TEXT;
