export const dynamic = 'force-dynamic'

export default async function StreamersPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Streamers</h1>
      <p className="text-sm text-muted-foreground mb-6">Discover creators and partners. (Stub)</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="border rounded p-4">
            <div className="h-24 bg-muted rounded mb-2" />
            <div className="font-medium">Streamer #{i}</div>
            <div className="text-xs text-muted-foreground">Coming soon…</div>
          </div>
        ))}
      </div>
    </div>
  )
}
