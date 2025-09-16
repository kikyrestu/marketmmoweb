"use client";
import { useState } from "react";

export default function StreamerForm({ initial }: { initial?: any }) {
  const [name, setName] = useState(initial?.name || "");
  const [platform, setPlatform] = useState(initial?.platform || "");
  const [url, setUrl] = useState(initial?.url || "");
  const [status, setStatus] = useState(initial?.status || "ACTIVE");
  const [bio, setBio] = useState(initial?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateForm = () => {
    if (!name.trim()) return 'Nama wajib diisi';
    if (!platform.trim()) return 'Platform wajib diisi';
    if (!url.trim()) return 'Link wajib diisi';
    return null;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const errorMsg = validateForm();
    if (errorMsg) {
      setLoading(false);
      import('sonner').then(({ toast }) => toast.error(errorMsg));
      setError(errorMsg);
      return;
    }
    const method = initial?.id ? "PATCH" : "POST";
    const res = await fetch("/api/admin/streamers", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: initial?.id, name, platform, url, status, bio, avatarUrl })
    });
    setLoading(false);
    if (res.ok) {
      import('sonner').then(({ toast }) => toast.success('Streamer saved!'));
      setTimeout(() => { window.location.href = "/admin/streamers"; }, 1200);
    } else {
      const msg = await res.json().then(j => j.message || 'Gagal simpan data streamer!').catch(()=> 'Gagal simpan data streamer!');
      import('sonner').then(({ toast }) => toast.error(msg));
      setError(msg);
    }
  };

  return (
    <form className="space-y-4 max-w-lg mx-auto" onSubmit={handleSubmit}>
      {error && <p className="text-red-500">{error}</p>}
      <div>
        <label className="block text-sm mb-1">Nama</label>
        <input value={name} onChange={e => setName(e.target.value)} required className="w-full rounded border px-3 py-2 bg-background" />
      </div>
      <div>
        <label className="block text-sm mb-1">Platform</label>
        <input value={platform} onChange={e => setPlatform(e.target.value)} required className="w-full rounded border px-3 py-2 bg-background" placeholder="Twitch, YouTube, dll" />
      </div>
      <div>
        <label className="block text-sm mb-1">Link</label>
        <input value={url} onChange={e => setUrl(e.target.value)} required className="w-full rounded border px-3 py-2 bg-background" placeholder="https://..." />
      </div>
      <div>
        <label className="block text-sm mb-1">Bio</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} className="w-full rounded border px-3 py-2 bg-background" placeholder="Deskripsi streamer" />
      </div>
      <div>
        <label className="block text-sm mb-1">Avatar URL</label>
        <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="w-full rounded border px-3 py-2 bg-background" placeholder="https://... atau /uploads/..." />
        {avatarUrl && <img src={avatarUrl} alt="avatar" className="h-16 mt-2 rounded-full border" />}
      </div>
      <div>
        <label className="block text-sm mb-1">Status</label>
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded border px-3 py-2 bg-background">
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>
      <button type="submit" disabled={loading} className="px-3 py-2 rounded-md border hover:bg-accent disabled:opacity-50">{loading ? "Saving..." : (initial?.id ? "Update" : "Create")}</button>
    </form>
  );
}
