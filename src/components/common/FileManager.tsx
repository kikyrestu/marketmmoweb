"use client";
import React, { useEffect, useState, useRef } from 'react';

const UPLOADS_PATH = '/uploads';

export default function FileManager() {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/filemanager')
      .then(res => res.json())
      .then(data => {
        setFiles(data.files || []);
        setLoading(false);
      });
  }, []);

  const handleCopy = (file: string) => {
    navigator.clipboard.writeText(`${UPLOADS_PATH}/${file}`);
    import('sonner').then(({ toast }) => toast.success('URL copied!'));
  };

  const handleDelete = async (file: string) => {
    if (!confirm('Delete this file?')) return;
    const res = await fetch(`/api/filemanager?file=${file}`, { method: 'DELETE' });
    if (res.ok) {
      setFiles(files.filter(f => f !== file));
      import('sonner').then(({ toast }) => toast.success('File deleted!'));
    } else {
      import('sonner').then(({ toast }) => toast.error('Gagal hapus file!'));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'application/pdf', 'image/jpg'
    ];
    if (!allowedTypes.includes(file.type)) {
      import('sonner').then(({ toast }) => toast.error('Hanya gambar (jpg, jpeg, png, gif, svg) dan PDF yang boleh di-upload!'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/filemanager/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      setFiles([data.filename, ...files]);
      import('sonner').then(({ toast }) => toast.success('File uploaded!'));
    } else {
      import('sonner').then(({ toast }) => toast.error('Upload failed!'));
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredFiles = files.filter(f => f.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="p-6 animate-pulse">
      <div className="h-6 bg-muted rounded w-1/2 mb-2" />
      <div className="h-4 bg-muted rounded w-1/3 mb-2" />
      <div className="h-32 bg-muted rounded" />
      <div className="h-32 bg-muted rounded mt-2" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">File Manager</h2>
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border rounded w-full"
        />
        <label className="px-3 py-2 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700">
          {uploading ? 'Uploading...' : 'Tambah File'}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
            accept="image/*,application/pdf"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredFiles.length === 0 && <div className="col-span-full text-center text-muted-foreground">No files found.</div>}
        {filteredFiles.map((file, idx) => {
          const isImage = /\.(jpg|jpeg|png|gif|svg)$/i.test(file);
          return (
            <div key={`${file}-${idx}`} className="border rounded-lg p-2 flex flex-col items-center bg-background shadow">
              {isImage ? (
                <img src={`${UPLOADS_PATH}/${file}`} alt={file} className="w-full h-32 object-contain mb-2 rounded" />
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-muted-foreground text-white rounded mb-2">
                  <span className="text-xs">{file.split('.').pop()?.toUpperCase()} file</span>
                </div>
              )}
              <span className="text-xs truncate w-full mb-1" title={file}>{file}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(file)}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  aria-label={`Copy URL ${file}`}
                >Copy URL</button>
                <button
                  onClick={() => handleDelete(file)}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  aria-label={`Delete ${file}`}
                >Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
