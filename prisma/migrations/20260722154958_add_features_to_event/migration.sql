-- AlterTable
ALTER TABLE "TicketType" ADD COLUMN     "isPack" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentTicketTypeId" TEXT,
ADD COLUMN     "ticketsPerBundle" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_parentTicketTypeId_fkey" FOREIGN KEY ("parentTicketTypeId") REFERENCES "TicketType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
