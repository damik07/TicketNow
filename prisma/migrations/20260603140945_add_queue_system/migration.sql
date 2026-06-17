/*
  Warnings:

  - You are about to drop the `QueueEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "QueueEntry" DROP CONSTRAINT "QueueEntry_event_id_fkey";

-- DropForeignKey
ALTER TABLE "QueueEntry" DROP CONSTRAINT "QueueEntry_user_id_fkey";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "max_concurrent" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "queue_active" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "QueueEntry";

-- CreateTable
CREATE TABLE "queue_entries" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "admitted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "queue_entries_session_token_key" ON "queue_entries"("session_token");

-- CreateIndex
CREATE INDEX "queue_entries_event_id_status_idx" ON "queue_entries"("event_id", "status");

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
