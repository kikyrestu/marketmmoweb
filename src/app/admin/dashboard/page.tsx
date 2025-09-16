import { cookies, headers } from 'next/headers'

type Metrics = {
	totalUsers: number
	totalTransactions: number
	transactionsByStatus: Record<string, number>
	gmvCompleted: number
	platformFeeBps: number
	feeRevenue: number
	days?: number
	trend?: { day: string | Date; count: number; sum: number }[]
	topSellers?: { sellerId: string; gmv: number; seller: { id: string; name: string | null; email: string } | null }[]
	recentTransactions?: { id: string; totalPrice: number; createdAt: string; item: { id: string; name: string }; buyer: { id: string; name: string | null; email: string }; seller: { id: string; name: string | null; email: string } }[]
}

export const dynamic = 'force-dynamic'

async function getMetrics(days?: number): Promise<Metrics> {
	// Call internal API with cookies to forward session
	const cookieHeader = (await cookies()).toString()
	const h = await headers()
	const host = h.get('x-forwarded-host') || h.get('host')
	const proto = h.get('x-forwarded-proto') || 'http'
	const base = `${proto}://${host}`
	const qs = days ? `?days=${days}` : ''
	const res = await fetch(`${base}/api/admin/metrics${qs}`, {
		headers: { cookie: cookieHeader },
		cache: 'no-store',
	})
	if (!res.ok) throw new Error('Failed to load metrics')
	return res.json()
}

function formatCurrency(n: number) {
	try {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
	} catch {
		return `Rp ${Math.round(n).toLocaleString('id-ID')}`
	}
}

export default async function AdminDashboardPage({ searchParams }: { searchParams?: Promise<{ days?: string }> }) {
	const sp = (await searchParams) || {}
	const days = sp.days ? Number(sp.days) : undefined
	const data = await getMetrics(days)
	const { totalUsers, totalTransactions, transactionsByStatus, gmvCompleted, feeRevenue, platformFeeBps, trend = [], topSellers = [], recentTransactions = [] } = data
	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Dasbor</h1>
				<p className="text-sm text-muted-foreground">Ringkasan metrik marketplace (biaya {platformFeeBps/100}%).</p>
			</div>
			<form className="flex items-center gap-3">
				<label className="text-sm text-muted-foreground">Rentang:</label>
				<a className={`text-sm px-2 py-1 rounded border ${(!days || days===7)?'bg-accent':''}`} href="/admin/dashboard?days=7">7H</a>
				<a className={`text-sm px-2 py-1 rounded border ${days===30?'bg-accent':''}`} href="/admin/dashboard?days=30">30H</a>
				<a className={`text-sm px-2 py-1 rounded border ${days===90?'bg-accent':''}`} href="/admin/dashboard?days=90">90H</a>
			</form>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-lg border p-4 bg-card">
					<div className="text-xs text-muted-foreground">Total Pengguna</div>
					<div className="text-2xl font-semibold mt-1">{totalUsers}</div>
				</div>
				<div className="rounded-lg border p-4 bg-card">
					<div className="text-xs text-muted-foreground">Total Transaksi</div>
					<div className="text-2xl font-semibold mt-1">{totalTransactions}</div>
				</div>
				<div className="rounded-lg border p-4 bg-card">
					<div className="text-xs text-muted-foreground">GMV (Selesai)</div>
					<div className="text-2xl font-semibold mt-1">{formatCurrency(gmvCompleted)}</div>
				</div>
				<div className="rounded-lg border p-4 bg-card">
					<div className="text-xs text-muted-foreground">Pendapatan Biaya</div>
					<div className="text-2xl font-semibold mt-1">{formatCurrency(feeRevenue)}</div>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="rounded-lg border p-4 bg-card">
					<h2 className="text-sm font-medium">Transaksi berdasarkan Status</h2>
					<div className="mt-3 grid grid-cols-2 gap-3 text-sm">
						{Object.entries(transactionsByStatus).map(([k,v]) => (
							<div key={k} className="flex items-center justify-between border rounded-md px-3 py-2">
								<span className="text-muted-foreground">{k}</span>
								<span className="font-medium">{v}</span>
							</div>
						))}
					</div>
				</div>
				<div className="rounded-lg border p-4 bg-card">
					<h2 className="text-sm font-medium">Trend GMV</h2>
					<div className="mt-3">
						<div className="w-full h-36 relative">
							{/* simple sparkline w/o deps */}
							{(() => {
								if (!trend.length) return <div className="text-xs text-muted-foreground">Tidak ada data</div>
								const max = Math.max(...trend.map(t => t.sum || 0), 1)
								return (
									<svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
										{trend.map((t, i) => {
											const x = (i/(trend.length-1||1))*100
											const y = 100 - ((Number(t.sum)||0)/max)*100
											const prev = i>0 ? trend[i-1] : null
											if (!prev) return null
											const x2 = ((i-1)/(trend.length-1||1))*100
											const y2 = 100 - ((Number(prev.sum)||0)/max)*100
											return <line key={i} x1={`${x2}%`} y1={`${y2}%`} x2={`${x}%`} y2={`${y}%`} stroke="hsl(var(--primary))" strokeWidth="2" />
										})}
									</svg>
								)
							})()}
						</div>
						<div className="mt-2 text-xs text-muted-foreground">{trend.length} titik</div>
					</div>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="rounded-lg border p-4 bg-card">
					<h2 className="text-sm font-medium">Penjual Teratas</h2>
					<div className="mt-3 space-y-2">
						{topSellers.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
						{topSellers.map((t, idx) => (
							<div key={t.sellerId} className="flex items-center justify-between border rounded-md px-3 py-2">
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">#{idx+1}</span>
									<div className="flex flex-col">
										<span className="text-sm font-medium">{t.seller?.name || 'Tidak diketahui'}</span>
										<span className="text-xs text-muted-foreground">{t.seller?.email}</span>
									</div>
								</div>
								<div className="text-sm font-semibold">{formatCurrency(t.gmv)}</div>
							</div>
						))}
					</div>
				</div>
				<div className="rounded-lg border p-4 bg-card">
					<h2 className="text-sm font-medium">Transaksi Terbaru</h2>
					<div className="mt-3 space-y-2">
						{recentTransactions.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
						{recentTransactions.map(tx => (
							<div key={tx.id} className="flex items-center justify-between border rounded-md px-3 py-2">
								<div className="flex flex-col">
									<span className="text-sm font-medium">{tx.item.name}</span>
									<span className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString('id-ID')}</span>
								</div>
								<div className="text-right">
									<div className="text-sm font-semibold">{formatCurrency(tx.totalPrice)}</div>
									<div className="text-xs text-muted-foreground">{tx.buyer.name || tx.buyer.email} → {tx.seller.name || tx.seller.email}</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

