import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function requireAdmin(role?: string | null) {
	return role === 'ADMIN'
}

function getFeeBps() {
	const bpsEnv = process.env.PLATFORM_FEE_BPS
	const pctEnv = process.env.PLATFORM_FEE_PERCENT
	if (bpsEnv && !Number.isNaN(Number(bpsEnv))) return Number(bpsEnv)
	if (pctEnv && !Number.isNaN(Number(pctEnv))) return Math.round(Number(pctEnv) * 100)
	return 500 // default 5%
}

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
		if (!requireAdmin((session.user as any).role)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

		const { searchParams } = new URL(request.url)
		const daysParam = Number(searchParams.get('days') || '30')
		const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 30
		const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

		const [totalUsers, totalTransactions, byStatusAgg, completedAgg, trend, topSellersAgg, recentTx] = await Promise.all([
			prisma.user.count(),
			prisma.transaction.count(),
			prisma.transaction.groupBy({
				by: ['status'],
				_count: { _all: true },
			}),
			prisma.transaction.aggregate({
				where: { status: 'COMPLETED' },
				_sum: { totalPrice: true },
			}),
			prisma.$queryRaw<{ day: Date; count: number; sum: number }[]>`
				SELECT date_trunc('day', "createdAt") as day,
							 COUNT(*)::int as count,
							 COALESCE(SUM("totalPrice"), 0)::float as sum
				FROM "Transaction"
				WHERE status = 'COMPLETED' AND "createdAt" >= ${since}
				GROUP BY day
				ORDER BY day ASC
			`,
			prisma.transaction.groupBy({
				by: ['sellerId'],
				where: { status: 'COMPLETED' },
				_sum: { totalPrice: true },
				orderBy: { _sum: { totalPrice: 'desc' } },
				take: 5,
			}),
			prisma.transaction.findMany({
				where: { status: 'COMPLETED' },
				orderBy: { createdAt: 'desc' },
				take: 10,
				select: {
					id: true,
					totalPrice: true,
					createdAt: true,
					item: { select: { id: true, name: true } },
					buyer: { select: { id: true, name: true, email: true } },
					seller: { select: { id: true, name: true, email: true } },
				},
			}),
		])

		const transactionsByStatus: Record<string, number> = {
			PENDING: 0,
			PROCESSING: 0,
			COMPLETED: 0,
			CANCELLED: 0,
			REFUNDED: 0,
		}
		for (const row of byStatusAgg) {
			transactionsByStatus[row.status] = row._count._all
		}

			const gmvCompleted = Number(completedAgg._sum.totalPrice ?? 0)
		const platformFeeBps = getFeeBps()
		const feeRevenue = (gmvCompleted * platformFeeBps) / 10000

			// Resolve top seller profiles
			const sellerIds = topSellersAgg.map(t => t.sellerId)
			const sellers = sellerIds.length
				? await prisma.user.findMany({ where: { id: { in: sellerIds } }, select: { id: true, name: true, email: true } })
				: []
			const topSellers = topSellersAgg.map(t => ({
				sellerId: t.sellerId,
				gmv: Number(t._sum.totalPrice ?? 0),
				seller: sellers.find(s => s.id === t.sellerId) || null,
			}))

		return NextResponse.json({
			totalUsers,
			totalTransactions,
			transactionsByStatus,
			gmvCompleted,
			platformFeeBps,
				feeRevenue,
				days,
				trend,
				topSellers,
				recentTransactions: recentTx,
		})
	} catch (e) {
		console.error('[ADMIN_METRICS_GET]', e)
		return NextResponse.json({ message: 'Internal error' }, { status: 500 })
	}
}

