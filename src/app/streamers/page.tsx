export const dynamic = 'force-dynamic'

import { cookies, headers as nextHeaders } from 'next/headers';

async function fetchStreamers() {
  const h = await nextHeaders();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const base = `${proto}://${host}`;
  const ck = await cookies();
  const cookieHeader = ck.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  const res = await fetch(`${base}/api/admin/streamers`, { headers: { cookie: cookieHeader } });
  if (!res.ok) throw new Error('Failed to load streamers');
  return res.json();
}

export default async function StreamersPage() {
  const streamers = await fetchStreamers();
  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Streamers</h1>
      <p className="text-sm text-muted-foreground mb-6">Discover creators and partners.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {streamers.length === 0 && (
          <div className="col-span-3 text-center text-muted-foreground py-10">Belum ada streamer.</div>
        )}
        {streamers.map((s: any) => (
          <div key={s.id} className="border rounded p-4 flex flex-col items-center">
            {s.avatarUrl ? <img src={s.avatarUrl} alt="avatar" className="h-24 w-24 rounded-full mb-2 border" /> : <div className="h-24 w-24 bg-muted rounded-full mb-2" />}
            <div className="font-medium text-lg mb-1">{s.name}</div>
            <div className="text-xs text-muted-foreground mb-2">{s.platform}</div>
            <div className="text-sm mb-2">{s.bio || <span className="text-muted-foreground">-</span>}</div>
            <a href={s.url} className="underline text-blue-600" target="_blank">Visit Channel</a>
          </div>
        ))}
      </div>
    </div>
  )
}
