import Image from 'next/image'
import { prisma } from '@/lib/prisma'

export const revalidate = 60 // refresh every minute

async function getData() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Recently sold transactions (COMPLETED)
  const recentlySold = await prisma.transaction.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: {
      id: true,
      totalPrice: true,
      createdAt: true,
      item: { select: { id: true, name: true, imageUrl: true } }
    }
  })

  // Pull last N transactions in last 7 days and aggregate top items by count
  const recentTx = await prisma.transaction.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { itemId: true, item: { select: { id: true, name: true, imageUrl: true, price: true } } }
  })
  const freq = new Map<string, { count: number; item: any }>()
  for (const t of recentTx) {
    const key = t.itemId
    const prev = freq.get(key)
    if (prev) prev.count += 1
    else freq.set(key, { count: 1, item: t.item })
  }
  const topItems = Array.from(freq.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return { recentlySold, topItems }
}

export default async function PricesPage() {
  const { recentlySold, topItems } = await getData()
  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Prices</h1>
      <p className="text-sm text-muted-foreground mb-6">Spotlight on market prices and trends. Auto-refreshed every minute.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <p className="text-sm font-semibold mb-3">Top items (last 7 days)</p>
          {topItems.length === 0 ? (
            <div className="text-xs text-muted-foreground">No data yet.</div>
          ) : (
            <ul className="space-y-3">
              {topItems.map(({ item, count }) => (
                <li key={item.id} className="flex items-center gap-3">
                  {item.imageUrl && (
                    <div className="relative w-10 h-10">
                      <Image src={item.imageUrl} alt={item.name} fill sizes="40px" className="object-cover rounded" unoptimized />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{count} sold</div>
                  </div>
                  <div className="text-sm tabular-nums whitespace-nowrap">Rp {(item.price || 0).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border rounded p-4">
          <p className="text-sm font-semibold mb-3">Recently sold</p>
          {recentlySold.length === 0 ? (
            <div className="text-xs text-muted-foreground">No completed transactions yet.</div>
          ) : (
            <ul className="space-y-3">
              {recentlySold.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  {t.item.imageUrl && (
                    <div className="relative w-10 h-10">
                      <Image src={t.item.imageUrl} alt={t.item.name} fill sizes="40px" className="object-cover rounded" unoptimized />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.item.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-sm tabular-nums whitespace-nowrap">Rp {Math.round(t.totalPrice).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
