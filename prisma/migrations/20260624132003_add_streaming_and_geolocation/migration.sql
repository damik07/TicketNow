/*
  Warnings:

  - A unique constraint covering the columns `[access_token]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PRESENCIAL', 'STREAMING', 'HIBRIDO');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "event_type" "EventType" NOT NULL DEFAULT 'PRESENCIAL',
ADD COLUMN     "streamingKey" TEXT,
ADD COLUMN     "streamingUrl" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "access_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_access_token_key" ON "Ticket"("access_token");
