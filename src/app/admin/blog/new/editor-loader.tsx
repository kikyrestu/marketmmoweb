'use client'

import dynamic from 'next/dynamic'

const BlogForm = dynamic(() => import('./blog-form').then(mod => mod.BlogForm), {
  ssr: false,
  loading: () => <p>Loading Editor...</p>
})

export function EditorLoader() {
  return <BlogForm />
}
