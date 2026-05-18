import { PackPercentApplyMode } from '@prisma/client'

/** Redondeo a 2 decimales (montos en moneda). */
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Normaliza desde DB (español), enum Prisma o valores legacy nunca migrados. */
export function normalizePackPercentApply(v: unknown): PackPercentApplyMode {
  if (
    v === PackPercentApplyMode.DEDUCE_DEL_PRECIO ||
    v === 'DEDUCE_DEL_PRECIO' ||
    v === 'deduce del precio' ||
    v === 'DEDUCTS_FROM_PRICE'
  ) {
    return PackPercentApplyMode.DEDUCE_DEL_PRECIO
  }
  return PackPercentApplyMode.ADICIONA_AL_PRECIO
}

/** Slice para cálculos: sin pack asociado = sin comisión (0 %). */
export function packCommissionSliceFromPack(
  pack: PackCommissionSlice | null | undefined
): PackCommissionSlice {
  if (!pack) {
    return {
      commissionType: 'porcentaje',
      commissionTickets: 0,
      commissionConsumptions: 0,
      ticketPercentApply: PackPercentApplyMode.ADICIONA_AL_PRECIO,
      consumptionPercentApply: PackPercentApplyMode.ADICIONA_AL_PRECIO,
    }
  }
  return {
    commissionType: pack.commissionType,
    commissionTickets: pack.commissionTickets,
    commissionConsumptions: pack.commissionConsumptions,
    ticketPercentApply: normalizePackPercentApply(pack.ticketPercentApply),
    consumptionPercentApply: normalizePackPercentApply(pack.consumptionPercentApply),
  }
}

function isConsumptionTicketTypeName(name: string): boolean {
  return name.toLowerCase().includes('consumición')
}

/** Forma mínima del pack para cálculos (compatible con `EventPack` de Prisma). */
export type PackCommissionSlice = {
  commissionType: string
  commissionTickets: number
  commissionConsumptions: number
  ticketPercentApply: PackPercentApplyMode
  consumptionPercentApply: PackPercentApplyMode
}

/**
 * Entradas — precio unitario que paga el comprador (checkout).
 * - porcentaje + ADICIONA_AL_PRECIO: lista × (1 + p/100)
 * - porcentaje + DEDUCE_DEL_PRECIO: paga el precio de lista (la comisión no lo incrementa)
 * - fijo: lista + monto fijo (cargo al comprador)
 */
export function ticketBuyerUnitPrice(listPrice: number, pack: PackCommissionSlice): number {
  const base = Math.max(0, listPrice)
  if (pack.commissionType !== 'porcentaje') {
    return roundMoney(base + (pack.commissionTickets || 0))
  }
  const p = (pack.commissionTickets || 0) / 100
  if (normalizePackPercentApply(pack.ticketPercentApply) === PackPercentApplyMode.ADICIONA_AL_PRECIO) {
    return roundMoney(base * (1 + p))
  }
  return roundMoney(base)
}

/** Entradas — comisión unitaria que retiene la plataforma (liquidación). */
export function ticketPlatformFeeUnit(listPrice: number, pack: PackCommissionSlice): number {
  const base = Math.max(0, listPrice)
  if (pack.commissionType !== 'porcentaje') {
    return roundMoney(Math.max(0, pack.commissionTickets || 0))
  }
  const p = (pack.commissionTickets || 0) / 100
  if (normalizePackPercentApply(pack.ticketPercentApply) === PackPercentApplyMode.ADICIONA_AL_PRECIO) {
    return roundMoney(base * p)
  }
  return roundMoney(base * p)
}

/** Entradas — neto unitario para el organizador (después de comisión). */
export function ticketOrganizerNetUnit(listPrice: number, pack: PackCommissionSlice): number {
  const base = Math.max(0, listPrice)
  const buyer = ticketBuyerUnitPrice(base, pack)
  const fee = ticketPlatformFeeUnit(base, pack)
  return roundMoney(buyer - fee)
}

/**
 * Consumiciones — monto que paga el consumidor por un cargo de lista `listAmount`.
 */
export function consumptionBuyerAmount(listAmount: number, pack: PackCommissionSlice): number {
  const base = Math.max(0, listAmount)
  if (pack.commissionType !== 'porcentaje') {
    return roundMoney(base + (pack.commissionConsumptions || 0))
  }
  const p = (pack.commissionConsumptions || 0) / 100
  if (normalizePackPercentApply(pack.consumptionPercentApply) === PackPercentApplyMode.ADICIONA_AL_PRECIO) {
    return roundMoney(base * (1 + p))
  }
  return roundMoney(base)
}

export function consumptionPlatformFee(listAmount: number, pack: PackCommissionSlice): number {
  const base = Math.max(0, listAmount)
  if (pack.commissionType !== 'porcentaje') {
    return roundMoney(Math.max(0, pack.commissionConsumptions || 0))
  }
  const p = (pack.commissionConsumptions || 0) / 100
  return roundMoney(base * p)
}

export function consumptionOrganizerNet(listAmount: number, pack: PackCommissionSlice): number {
  const base = Math.max(0, listAmount)
  return roundMoney(consumptionBuyerAmount(base, pack) - consumptionPlatformFee(base, pack))
}

/** Precio unitario de venta según tipo de ítem y pack del evento (checkout / órdenes). */
export function orderLineBuyerUnitPrice(
  listPrice: number,
  ticketTypeName: string,
  pack: PackCommissionSlice | null | undefined
): number {
  const slice = packCommissionSliceFromPack(pack)
  if (isConsumptionTicketTypeName(ticketTypeName)) {
    return consumptionBuyerAmount(listPrice, slice)
  }
  return ticketBuyerUnitPrice(listPrice, slice)
}
