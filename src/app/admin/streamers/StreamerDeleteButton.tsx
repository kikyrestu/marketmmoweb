"use client";
import { useState } from "react";

export default function StreamerDeleteButton({ id }: { id: string }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/streamers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    setLoading(false);
    setShowModal(false);
    if (res.ok) {
      setDeleted(true);
      import('sonner').then(({ toast }) => toast.success('Streamer deleted!'));
    } else {
      const msg = await res.json().then(j => j.message || 'Gagal hapus streamer!').catch(()=> 'Gagal hapus streamer!');
      import('sonner').then(({ toast }) => toast.error(msg));
    }
  };

  if (deleted) return null;

  return (
    <>
      <button className="underline text-red-600" onClick={() => setShowModal(true)} aria-label="Delete Streamer">Delete</button>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full text-center">
            <h3 className="text-lg font-bold mb-4">Konfirmasi Hapus</h3>
            <p className="mb-4">Yakin mau hapus streamer ini?</p>
            <div className="flex gap-2 justify-center">
              <button disabled={loading} className="px-3 py-1 bg-red-600 text-white rounded" onClick={handleDelete}>{loading ? "Deleting..." : "Hapus"}</button>
              <button disabled={loading} className="px-3 py-1 bg-gray-300 rounded" onClick={() => setShowModal(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}