import { cookies, headers as nextHeaders } from 'next/headers';
import Link from 'next/link';
import StreamerDeleteButton from './StreamerDeleteButton';

export const dynamic = 'force-dynamic';

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

export default async function AdminStreamersPage() {
  let streamers: any[] = [];
  let error = null;
  try {
    streamers = await fetchStreamers();
  } catch (e: any) {
    error = e.message || 'Failed to load streamers';
  }
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pengelolaan Streamer</h1>
          <p className="text-sm text-muted-foreground">Kelola data streamer, partner, dan creator.</p>
        </div>
        <Link href="/admin/streamers/new" className="px-3 py-2 rounded-md border hover:bg-accent" aria-label="Tambah Streamer">Tambah Streamer</Link>
      </div>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm" aria-label="Streamers Table">
          <thead className="bg-accent">
            <tr className="text-left">
              <th className="p-2">Avatar</th>
              <th className="p-2">Nama</th>
              <th className="p-2">Platform</th>
              <th className="p-2">Tautan</th>
              <th className="p-2">Bio</th>
              <th className="p-2">Status</th>
              <th className="p-2 w-24">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td className="p-6 text-center text-red-500" colSpan={7}>{error}</td>
              </tr>
            )}
            {!error && streamers.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={7}>Belum ada streamer. Mulai dengan menambah data baru.</td>
              </tr>
            )}
            {!error && streamers.length > 0 && streamers.map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.avatarUrl ? <img src={s.avatarUrl} alt="avatar" className="h-10 w-10 rounded-full border" /> : <span className="text-xs text-muted-foreground">No avatar</span>}</td>
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.platform}</td>
                <td className="p-2"><a href={s.url} className="underline" target="_blank" aria-label={`Link ${s.name}`}>{s.url}</a></td>
                <td className="p-2 text-xs">{s.bio || <span className="text-muted-foreground">-</span>}</td>
                <td className="p-2">{s.status}</td>
                <td className="p-2 flex gap-2">
                  <Link href={`/admin/streamers/edit?id=${s.id}`} className="underline text-blue-600" aria-label={`Edit ${s.name}`}>Edit</Link>
                  <StreamerDeleteButton id={s.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Skeleton loading */}
        {!error && streamers.length === 0 && (
          <div className="p-6 animate-pulse">
            <div className="h-6 bg-muted rounded w-1/2 mb-2" />
            <div className="h-4 bg-muted rounded w-1/3 mb-2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        )}
      </div>
    </div>
  )
}
