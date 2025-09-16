import { cookies, headers as nextHeaders } from 'next/headers';
import StreamerForm from '../StreamerForm';

export const dynamic = 'force-dynamic';

async function fetchStreamer(id: string) {
  const h = await nextHeaders();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const base = `${proto}://${host}`;
  const ck = await cookies();
  const cookieHeader = ck.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  const res = await fetch(`${base}/api/admin/streamers?id=${id}`, { headers: { cookie: cookieHeader } });
  if (!res.ok) throw new Error('Failed to load streamer');
  return res.json();
}

export default async function AdminStreamerEditPage({ searchParams }: { searchParams: Promise<{ id: string }> }) {
  const params = await searchParams;
  const id = params.id;
  const initial = id ? await fetchStreamer(id) : undefined;
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Edit Streamer</h1>
      <StreamerForm initial={initial} />
    </div>
  );
}
