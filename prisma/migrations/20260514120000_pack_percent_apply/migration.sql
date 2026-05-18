-- Valores del enum en español en PostgreSQL (ver @map en schema.prisma).
CREATE TYPE "PackPercentApplyMode" AS ENUM ('adiciona al precio', 'deduce del precio');

ALTER TABLE "EventPack" ADD COLUMN "ticket_percent_apply" "PackPercentApplyMode" NOT NULL DEFAULT 'adiciona al precio';
ALTER TABLE "EventPack" ADD COLUMN "consumption_percent_apply" "PackPercentApplyMode" NOT NULL DEFAULT 'adiciona al precio';
