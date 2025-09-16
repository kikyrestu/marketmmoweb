"use client";
import React, { useState } from 'react';

interface AssignRoleFormProps {
  users: { id: string; name: string | null; email: string; role: string }[];
}

export default function AssignRoleForm({ users }: AssignRoleFormProps) {
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const f = e.currentTarget;
    const data = new FormData(f);
    const res = await fetch('/api/admin/roles/assign', {
      method: 'POST',
      body: data,
    });
    if (res.ok) {
      location.reload();
    } else {
      alert('Gagal assign role!');
    }
    setPending(false);
  };

  return (
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <select name="userId" className="border rounded px-2 py-1">
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.name || u.email} ({u.role})
          </option>
        ))}
      </select>
      <input type="hidden" name="role" value="ADMIN" />
      <input type="hidden" name="scope" value="ESCROW" />
      <button type="submit" className="px-3 py-1 rounded bg-primary text-primary-foreground" disabled={pending}>
        {pending ? 'Menetapkan...' : 'Tetapkan'}
      </button>
    </form>
  );
}
