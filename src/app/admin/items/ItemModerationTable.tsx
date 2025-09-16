"use client";
import { useState } from 'react';

export default function ItemModerationTable({ items }: { items: any[] }) {
  const [filter, setFilter] = useState('ALL');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [localItems, setLocalItems] = useState(items);
  const filteredItems = (localItems || []).filter(i => {
    if (filter === 'ALL') return true;
    if (filter === 'AVAILABLE') return i.isAvailable === true;
    if (filter === 'UNAVAILABLE') return i.isAvailable === false;
    return true;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/admin/items/delete?id=${deleteId}`, { method: 'POST' });
    if (res.ok) {
      setLocalItems(localItems.filter(i => i.id !== deleteId));
      setDeleteId(null);
    } else {
      alert('Gagal menghapus item!');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Pengelolaan Barang</h1>
      <div className="mb-4 flex gap-2 items-center">
        <label className="font-semibold">Filter:</label>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="ALL">Semua</option>
          <option value="AVAILABLE">Tersedia</option>
          <option value="UNAVAILABLE">Tidak Tersedia</option>
        </select>
      </div>
      <table className="w-full text-sm border" aria-label="Tabel Barang">
        <thead>
          <tr className="bg-muted-foreground text-left">
            <th className="py-2 px-2">Nama</th>
            <th className="py-2 px-2">Tersedia</th>
            <th className="py-2 px-2">Harga</th>
            <th className="py-2 px-2">Penjual</th>
            <th className="py-2 px-2">Dibuat Pada</th>
            <th className="py-2 px-2">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 && (
            <tr>
              <td className="p-6 text-center text-muted-foreground" colSpan={6}>Belum ada barang untuk filter ini.</td>
            </tr>
          )}
          {filteredItems.length > 0 && filteredItems.map(i => (
            <tr key={i.id} className="border-b">
              <td className="py-2 px-2">{i.name}</td>
              <td className="py-2 px-2">{i.isAvailable ? 'Ya' : 'Tidak'}</td>
              <td className="py-2 px-2">Rp {i.price?.toLocaleString()}</td>
              <td className="py-2 px-2">{i.sellerId}</td>
              <td className="py-2 px-2">{new Date(i.createdAt).toLocaleString()}</td>
              <td className="py-2 px-2">
                <a href={`/admin/items/edit/${i.id}`} className="px-2 py-1 bg-blue-600 text-white rounded text-xs mr-1" aria-label={`Edit ${i.name}`}>Edit</a>
                <button type="button" className="px-2 py-1 bg-gray-600 text-white rounded text-xs" aria-label={`Hapus ${i.name}`} onClick={() => setDeleteId(i.id)}>Hapus</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Skeleton loading */}
      {(!items || items.length === 0) && (
        <div className="p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-1/2 mb-2" />
          <div className="h-4 bg-muted rounded w-1/3 mb-2" />
          <div className="h-32 bg-muted rounded" />
        </div>
      )}
      {/* Pop up konfirmasi hapus */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
            <h2 className="text-lg font-bold mb-2">Konfirmasi Hapus</h2>
            <p className="mb-4">Yakin mau menghapus barang ini?</p>
            <div className="flex justify-center gap-2">
              <button type="button" className="px-4 py-2 bg-red-600 text-white rounded" onClick={handleDelete}>Hapus</button>
              <button type="button" className="px-4 py-2 bg-gray-300 rounded" onClick={() => setDeleteId(null)}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
