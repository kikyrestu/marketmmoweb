"use client"
import { useState } from 'react'

type Provider = { id: string; type: string; url: string; healthy: boolean; errors: number }
type Pool = { name: string; visibility: string; strategy: string; providers: Provider[] }

export function StorageEditor({ initial }: { initial: Pool[] }) {
  const [pools, setPools] = useState<Pool[]>(initial)

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const updated = pools.map((pl) => ({
      name: pl.name,
      visibility: pl.visibility,
      strategy: pl.strategy,
      providers: pl.providers.map((pr) => ({
        id: pr.id,
        type: pr.type,
        url: (form.querySelector(`input[name="url-${pl.name}-${pr.id}"]`) as HTMLInputElement)?.value || pr.url,
      })),
    }))
    await fetch('/api/admin/storage', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
    window.location.reload()
  }

  return (
    <form onSubmit={onSave}>
      <div className="space-y-4">
        {pools.map((pool) => (
          <div key={pool.name} className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-base font-medium">{pool.name}</div>
                <div className="text-xs text-muted-foreground">{pool.visibility} • {pool.strategy}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left py-1 pr-2">Penyedia</th>
                    <th className="text-left py-1 pr-2">Tipe</th>
                    <th className="text-left py-1 pr-2">URL</th>
                    <th className="text-left py-1 pr-2">Kesehatan</th>
                    <th className="text-left py-1 pr-2">Kesalahan</th>
                  </tr>
                </thead>
                <tbody>
                  {pool.providers.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="py-2 pr-2 font-medium">{p.id}</td>
                      <td className="py-2 pr-2">{p.type}</td>
                      <td className="py-2 pr-2 max-w-[520px]">
                        <input
                          name={`url-${pool.name}-${p.id}`}
                          defaultValue={p.url}
                          className="w-full rounded border bg-background px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <span className={p.healthy ? 'text-green-600' : 'text-red-600'}>{p.healthy ? 'Sehat' : 'Tidak Sehat'}</span>
                      </td>
                      <td className="py-2 pr-2">{p.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-4 px-3 py-1.5 text-xs rounded-md border hover:bg-accent">Simpan Perubahan</button>
    </form>
  )
}
