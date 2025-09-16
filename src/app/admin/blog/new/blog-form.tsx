'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createPost, updatePost, getBlogPost } from './actions'
import { EditorToolbar } from './editor-toolbar'
import { Editor } from '@tinymce/tinymce-react';
import { useRef, useState, useEffect, startTransition } from 'react';
import FileManager from '@/components/common/FileManager';

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending} className="px-3 py-2 rounded-md border hover:bg-accent disabled:opacity-50">{pending ? 'Creating...' : 'Create'}</button>
}

import { useSearchParams } from 'next/navigation';

export function BlogForm() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [state, formAction] = useActionState(id ? updatePost : createPost, { message: '' });
  const editorRef = useRef<any>(null);
  const [showFileManager, setShowFileManager] = useState(false);
  const [coverImage, setCoverImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [initial, setInitial] = useState<any>(null);

  useEffect(() => {
    if (id) {
      getBlogPost(id).then(data => {
        if (data) {
          setInitial(data);
          setCoverImage(data.coverImageUrl || '');
          if (editorRef.current) editorRef.current.setContent(data.content || '');
        }
      });
    }
  }, [id]);

  // ...existing code...

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/filemanager/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      setCoverImage(`/uploads/${data.filename}`);
    } else {
      alert('Upload failed!');
    }
    setUploading(false);
  };

  // Toast notification
  useEffect(() => {
    if (state.message && state.message !== 'OK') {
      import('sonner').then(({ toast }) => toast.error(state.message));
    }
    if (state.message === 'OK') {
      import('sonner').then(({ toast }) => toast.success('Blog post saved!'));
      setTimeout(() => { window.location.href = '/admin/blog'; }, 1200);
    }
  }, [state.message]);

  // Form validation (client-side)
  const validateForm = (formData: FormData) => {
    if (!formData.get('title')) return 'Title required';
    if (!formData.get('content') || !editorRef.current?.getContent()?.trim()) return 'Content required';
    return null;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const html = editorRef.current ? editorRef.current.getContent() : '';
    formData.set('content', html);
    if (id) formData.set('id', id);
    const error = validateForm(formData);
    if (error) {
      import('sonner').then(({ toast }) => toast.error(error));
      return;
    }
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      {/* Skeleton loading for initial data */}
      {!initial && id && (
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input name="title" required defaultValue={initial?.title || ''} className="w-full rounded border px-3 py-2 bg-background" aria-label="Blog Title" />
        </div>
        <div>
          <label className="block text-sm mb-1">Slug</label>
          <input name="slug" placeholder="auto from title" defaultValue={initial?.slug || ''} className="w-full rounded border px-3 py-2 bg-background" aria-label="Blog Slug" />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1">Excerpt</label>
        <textarea name="excerpt" rows={2} defaultValue={initial?.excerpt || ''} className="w-full rounded border px-3 py-2 bg-background" aria-label="Blog Excerpt" />
      </div>
      <div>
        <label className="block text-sm mb-1">Content</label>
        <Editor
          apiKey="p8mh15rfye8ce6bknw7n840ytopdv4f0shcjjfzt6wvaj4dm"
          onInit={(evt, editor) => (editorRef.current = editor)}
          initialValue="<p>Start writing your amazing blog post here!</p>"
          init={{
            height: 500,
            min_height: 300,
            max_height: 800,
            menubar: true,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor',
              'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'help', 'wordcount'
            ],
            toolbar:
              'undo redo | formatselect | bold italic underline strikethrough forecolor backcolor | link image media table | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | blockquote code fullscreen | removeformat | help',
            image_advtab: true,
            image_title: true,
            automatic_uploads: true,
            file_picker_types: 'image',
            fullscreen_native: true,
          }}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Cover Image</label>
          <div className="flex gap-2 mb-2">
            <input
              name="coverImageUrl"
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="/uploads/.. or https://.."
              className="w-full rounded border px-3 py-2 bg-background"
              aria-label="Cover Image URL"
            />
            <button type="button" className="px-2 py-1 bg-blue-500 text-white rounded" onClick={() => setShowFileManager(true)}>
              Pilih dari FileManager
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            <label className="px-2 py-1 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700">
              {uploading ? 'Uploading...' : 'Upload Gambar'}
              <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={uploading} />
            </label>
            {coverImage && (
              <img src={coverImage} alt="cover" className="h-12 rounded border" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pilih dari file manager atau upload gambar baru.</p>
        </div>
        <div>
          <label className="block text-sm mb-1">Tags (comma separated)</label>
          <input name="tags" placeholder="news, update" defaultValue={initial?.tags?.join(', ') || ''} className="w-full rounded border px-3 py-2 bg-background" aria-label="Blog Tags" />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1">Status</label>
        <select name="status" className="rounded border px-3 py-2 bg-background" defaultValue={initial?.status || 'DRAFT'} aria-label="Blog Status">
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>
      <SubmitButton />
      {/* Modal FileManager */}
      {showFileManager && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative">
            <button className="absolute top-2 right-2 text-lg" onClick={() => setShowFileManager(false)}>&times;</button>
            <FileManagerPicker onPick={url => { setCoverImage(url); setShowFileManager(false); }} />
          </div>
        </div>
      )}
    </form>
  );
}

// Komponen FileManagerPicker: hanya untuk memilih file gambar
function FileManagerPicker({ onPick }: { onPick: (url: string) => void }) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/filemanager')
      .then(res => res.json())
      .then(data => {
        setFiles(data.files?.filter((f: string) => /\.(jpg|jpeg|png|gif|svg)$/i.test(f)) || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading images...</div>;

  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Pilih Gambar</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {files.map((file, idx) => (
          <div key={`${file}-${idx}`} className="border rounded p-2 flex flex-col items-center cursor-pointer hover:bg-blue-50" onClick={() => onPick(`/uploads/${file}`)}>
            <img src={`/uploads/${file}`} alt={file} className="h-24 object-contain mb-2 rounded" />
            <span className="text-xs truncate w-full" title={file}>{file}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
