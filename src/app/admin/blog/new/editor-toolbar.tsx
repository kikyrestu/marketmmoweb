'use client'

import type { Editor } from '@tiptap/react'
import {
  Bold,
  Strikethrough,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Minus,
} from 'lucide-react'

type Props = {
  editor: Editor | null
}

export function EditorToolbar({ editor }: Props) {
  if (!editor) {
    return null
  }

  return (
    <div className="border border-input bg-transparent rounded-md p-1 flex flex-wrap items-center gap-1">
      <button
        onClick={() => editor.chain().focus().toggleMark('bold').run()}
        disabled={!editor.can().chain().focus().toggleMark('bold').run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
        type="button"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleMark('italic').run()}
        disabled={!editor.can().chain().focus().toggleMark('italic').run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
        type="button"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleMark('strike').run()}
        disabled={!editor.can().chain().focus().toggleMark('strike').run()}
        className={editor.isActive('strike') ? 'is-active' : ''}
        type="button"
      >
        <Strikethrough className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleNode('heading', 'paragraph', { level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        type="button"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleList('bulletList', 'listItem').run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''}
        type="button"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleList('orderedList', 'listItem').run()}
        className={editor.isActive('orderedList') ? 'is-active' : ''}
        type="button"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleNode('blockquote', 'paragraph').run()}
        className={editor.isActive('blockquote') ? 'is-active' : ''}
        type="button"
      >
        <Quote className="w-4 h-4" />
      </button>
       <button onClick={() => editor.chain().focus().setNode('horizontalRule').run()} type="button">
        <Minus className="w-4 h-4" />
      </button>
      <style jsx>{`
        button {
          padding: 0.25rem;
          border-radius: 0.25rem;
        }
        button.is-active {
          background-color: hsl(var(--accent));
        }
        button:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  )
}
