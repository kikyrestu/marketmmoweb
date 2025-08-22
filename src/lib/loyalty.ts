import { prisma } from '@/lib/prisma'

export type LoyaltyAwardInput = {
  userId: string
  points: number
  reason?: string
  refType?: string
  refId?: string
  meta?: any
}

export function computeTier(totalPoints: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' {
  if (totalPoints >= 20000) return 'PLATINUM'
  if (totalPoints >= 10000) return 'GOLD'
  if (totalPoints >= 3000) return 'SILVER'
  return 'BRONZE'
}

export async function awardLoyalty(input: LoyaltyAwardInput) {
  const delta = Math.floor(input.points)
  if (!Number.isFinite(delta) || delta === 0) return null

  // Create ledger entry
  await (prisma as any).loyaltyLedger.create({
    data: {
      userId: input.userId,
      delta,
      reason: input.reason,
      refType: input.refType,
      refId: input.refId,
      meta: input.meta,
    },
  })

  // Upsert summary
  const summary = await (prisma as any).loyaltySummary.upsert({
    where: { userId: input.userId },
    update: { totalPoints: { increment: delta } },
    create: { userId: input.userId, totalPoints: Math.max(delta, 0) },
  })

  const newTier = computeTier(summary.totalPoints)
  if (newTier !== summary.tier) {
    await (prisma as any).loyaltySummary.update({ where: { userId: input.userId }, data: { tier: newTier } })
  }

  return await (prisma as any).loyaltySummary.findUnique({ where: { userId: input.userId } })
}

export async function getLoyalty(userId: string) {
  const summary = await (prisma as any).loyaltySummary.findUnique({ where: { userId } })
  const points = summary?.totalPoints || 0
  const tier = summary?.tier || computeTier(0)
  return { points, tier }
}
