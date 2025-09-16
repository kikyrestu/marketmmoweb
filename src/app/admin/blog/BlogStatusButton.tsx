"use client";
import { useState } from "react";

export default function BlogStatusButton({ id, status }: { id: string, status: string }) {
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);
  const nextStatus = localStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  const handleStatus = async () => {
    setLoading(true);
    setLocalStatus(nextStatus); // Optimistic UI
    const res = await fetch("/api/admin/blog/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus })
    });
    setLoading(false);
    if (res.ok) {
      import('sonner').then(({ toast }) => toast.success(`Status updated to ${nextStatus}`));
    } else {
      setLocalStatus(status); // revert
      const msg = await res.json().then(j => j.message || 'Gagal update status!').catch(()=> 'Gagal update status!');
      import('sonner').then(({ toast }) => toast.error(msg));
    }
  };

  return (
    <button className={"underline text-green-600"} disabled={loading} aria-label={nextStatus} onClick={handleStatus}>
      {loading ? (nextStatus === "PUBLISHED" ? "Publishing..." : "Unpublishing...") : (localStatus === "PUBLISHED" ? "Unpublish" : "Publish")}
    </button>
  );
}
