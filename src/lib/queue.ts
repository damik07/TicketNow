import { prisma } from '@/lib/db'

/** Tiempo máximo en checkout (10 minutos). */
export const QUEUE_SESSION_MS = 10 * 60 * 1000

export type QueueEntryStatus = 'waiting' | 'admitted' | 'expired' | 'completed'

function newSessionToken(prefix: 'direct' | 'wait'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** Marca admisiones vencidas como expired y libera cupos. */
export async function expireStaleAdmissions(eventId: string, now = new Date()) {
  await prisma.queueEntry.updateMany({
    where: {
      eventId,
      status: 'admitted',
      expiresAt: { lt: now },
    },
    data: { status: 'expired' },
  })
}

/** Usuarios con turno activo de compra (no completaron ni venció el timer). */
export async function countActiveAdmitted(eventId: string, now = new Date()) {
  return prisma.queueEntry.count({
    where: {
      eventId,
      status: 'admitted',
      expiresAt: { gt: now },
    },
  })
}

/**
 * Admite hasta llenar `maxConcurrent` desde la fila waiting (FIFO por position).
 * Idempotente y seguro bajo concurrencia (SKIP LOCKED).
 */
export async function processAdmissions(eventId: string, now = new Date()) {
  await expireStaleAdmissions(eventId, now)

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { maxConcurrent: true },
  })
  if (!event) return { admittedCount: 0, slotsRemaining: 0 }

  const maxConcurrent = Math.max(1, event.maxConcurrent)

  return prisma.$transaction(async (tx) => {
    const currentActive = await tx.queueEntry.count({
      where: {
        eventId,
        status: 'admitted',
        expiresAt: { gt: now },
      },
    })

    const availableSlots = maxConcurrent - currentActive
    if (availableSlots <= 0) {
      return { admittedCount: 0, slotsRemaining: 0 }
    }

    const nextInLine = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "queue_entries"
      WHERE "event_id" = ${eventId} AND "status" = 'waiting'
      ORDER BY "position" ASC
      LIMIT ${availableSlots}
      FOR UPDATE SKIP LOCKED
    `

    if (nextInLine.length === 0) {
      return { admittedCount: 0, slotsRemaining: availableSlots }
    }

    const expiresAt = new Date(now.getTime() + QUEUE_SESSION_MS)
    await tx.queueEntry.updateMany({
      where: { id: { in: nextInLine.map((e) => e.id) } },
      data: {
        status: 'admitted',
        admittedAt: now,
        expiresAt,
      },
    })

    return {
      admittedCount: nextInLine.length,
      slotsRemaining: availableSlots - nextInLine.length,
    }
  }, { timeout: 10000 })
}

async function nextWaitingPosition(eventId: string) {
  const last = await prisma.queueEntry.findFirst({
    where: { eventId, status: 'waiting' },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  return (last?.position ?? 0) + 1
}

export type JoinQueueResult =
  | { action: 'allow_checkout'; sessionToken: string; expiresAt: string }
  | { action: 'redirect_to_queue'; sessionToken: string; position: number }
  | { action: 'rejected_limit_reached'; error: string }

/**
 * Entrada a la cola / checkout.
 * - Respeta `maxConcurrent` del evento.
 * - Si `queueActive`: siempre pasa por sala de espera (aunque haya cupo).
 * - Si no hay cupo: waiting FIFO.
 * - Si hay cupo y cola apagada: admisión directa con timer de 10 min.
 */
export async function joinQueue(eventId: string, userId: string): Promise<JoinQueueResult> {
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) throw new Error('EVENT_NOT_FOUND')

  const ticketsAlreadyBought = await prisma.ticket.count({
    where: {
      eventId,
      userId,
      order: { paymentStatus: 'aprobado' },
    },
  })

  if (ticketsAlreadyBought >= event.maxTicketsPerUser) {
    return {
      action: 'rejected_limit_reached',
      error: `Ya alcanzaste el límite máximo de ${event.maxTicketsPerUser} entradas para este evento.`,
    }
  }

  const now = new Date()
  await expireStaleAdmissions(eventId, now)

  // Turno activo existente
  const activeAdmitted = await prisma.queueEntry.findFirst({
    where: {
      eventId,
      userId,
      status: 'admitted',
      expiresAt: { gt: now },
    },
    orderBy: { admittedAt: 'desc' },
  })
  if (activeAdmitted) {
    return {
      action: 'allow_checkout',
      sessionToken: activeAdmitted.sessionToken,
      expiresAt: activeAdmitted.expiresAt!.toISOString(),
    }
  }

  // Ya en fila
  const waitingEntry = await prisma.queueEntry.findFirst({
    where: { eventId, userId, status: 'waiting' },
    orderBy: { createdAt: 'asc' },
  })
  if (waitingEntry) {
    return {
      action: 'redirect_to_queue',
      sessionToken: waitingEntry.sessionToken,
      position: waitingEntry.position,
    }
  }

  const activeCount = await countActiveAdmitted(eventId, now)
  const hasSlot = activeCount < event.maxConcurrent

  // Cupo libre y cola virtual apagada → checkout directo
  if (hasSlot && !event.queueActive) {
    const token = newSessionToken('direct')
    const expiresAt = new Date(now.getTime() + QUEUE_SESSION_MS)

    const created = await prisma.$transaction(async (tx) => {
      const current = await tx.queueEntry.count({
        where: { eventId, status: 'admitted', expiresAt: { gt: now } },
      })
      if (current >= event.maxConcurrent) return null

      return tx.queueEntry.create({
        data: {
          eventId,
          userId,
          sessionToken: token,
          position: 0,
          status: 'admitted',
          admittedAt: now,
          expiresAt,
        },
      })
    })

    if (created) {
      return {
        action: 'allow_checkout',
        sessionToken: token,
        expiresAt: expiresAt.toISOString(),
      }
    }
    // Perdió carrera: cae a waiting abajo
  }

  // Sala de espera
  const position = await nextWaitingPosition(eventId)
  const token = newSessionToken('wait')
  const entry = await prisma.queueEntry.create({
    data: {
      eventId,
      userId,
      sessionToken: token,
      position,
      status: 'waiting',
    },
  })

  await processAdmissions(eventId, now)

  return {
    action: 'redirect_to_queue',
    sessionToken: entry.sessionToken,
    position: entry.position,
  }
}

export async function getQueueStatus(sessionToken: string, eventId: string) {
  await processAdmissions(eventId)

  const entry = await prisma.queueEntry.findUnique({
    where: { sessionToken },
  })

  if (!entry || entry.eventId !== eventId) {
    return { status: 'expired' as const, message: 'Token no válido o expirado' }
  }

  if (entry.status === 'admitted') {
    if (!entry.expiresAt || entry.expiresAt <= new Date()) {
      await prisma.queueEntry.update({
        where: { id: entry.id },
        data: { status: 'expired' },
      })
      await processAdmissions(eventId)
      return { status: 'expired' as const, message: 'Tiempo de compra agotado' }
    }
    return {
      status: 'admitted' as const,
      expiresAt: entry.expiresAt.toISOString(),
      maxConcurrent: (await prisma.event.findUnique({ where: { id: eventId }, select: { maxConcurrent: true } }))?.maxConcurrent,
    }
  }

  if (entry.status === 'completed') {
    return { status: 'completed' as const }
  }

  if (entry.status !== 'waiting') {
    return { status: entry.status as 'expired', message: 'Sesión finalizada' }
  }

  const peopleAhead = await prisma.queueEntry.count({
    where: {
      eventId,
      status: 'waiting',
      position: { lt: entry.position },
    },
  })

  const totalWaiting = await prisma.queueEntry.count({
    where: { eventId, status: 'waiting' },
  })

  const activeAdmitted = await countActiveAdmitted(eventId)
  const maxConcurrent = (await prisma.event.findUnique({
    where: { id: eventId },
    select: { maxConcurrent: true },
  }))?.maxConcurrent ?? 50

  return {
    status: 'waiting' as const,
    currentPosition: peopleAhead + 1,
    totalWaiting,
    activeAdmitted,
    maxConcurrent,
  }
}

export async function validateCheckoutAccess(
  sessionToken: string | null | undefined,
  userId: string,
  eventId: string
) {
  if (!sessionToken) {
    return { ok: false as const, reason: 'missing_token' }
  }

  await processAdmissions(eventId)

  const entry = await prisma.queueEntry.findUnique({ where: { sessionToken } })
  if (!entry || entry.eventId !== eventId || entry.userId !== userId) {
    return { ok: false as const, reason: 'invalid_token' }
  }

  if (entry.status === 'completed') {
    return { ok: false as const, reason: 'already_completed' }
  }

  if (entry.status !== 'admitted') {
    return { ok: false as const, reason: 'not_admitted' }
  }

  if (!entry.expiresAt || entry.expiresAt <= new Date()) {
    await prisma.queueEntry.update({
      where: { id: entry.id },
      data: { status: 'expired' },
    })
    await processAdmissions(eventId)
    return { ok: false as const, reason: 'expired' }
  }

  return { ok: true as const, entry }
}

/** Libera cupo tras compra simulada/aprobada. */
export async function completeQueueSession(sessionToken: string, eventId: string) {
  await prisma.queueEntry.updateMany({
    where: { sessionToken, eventId, status: 'admitted' },
    data: { status: 'completed' },
  })
  await processAdmissions(eventId)
}
