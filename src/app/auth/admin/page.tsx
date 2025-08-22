"use client"
import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Admin-only login wrapper: after successful sign-in verify role; if not ADMIN, show error.
function AdminSignInInner() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/admin'
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string
    try {
      const res = await signIn('credentials', { email, password, redirect: false })
      if (res?.error) { setError('Invalid credentials'); return }
      // fetch /api/user/me to confirm role
      const me = await fetch('/api/user/me').then(r=> r.ok ? r.json() : null)
      if (!me || me.role !== 'ADMIN') {
        setError('Akses ditolak: bukan akun ADMIN')
        return
      }
      router.push(callbackUrl)
      router.refresh()
    } catch (err) {
      setError('Login gagal')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Card className="w-[360px]">
        <CardHeader>
          <CardTitle>Admin Sign In</CardTitle>
          <CardDescription>Masuk khusus administrator platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Checking...' : 'Sign In'}</Button>
            <div className="text-center text-xs text-muted-foreground pt-2">
              Bukan admin? <Link href="/auth/signin" className="text-blue-500 hover:underline">User login</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminSignInPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading…</div>}>
      <AdminSignInInner />
    </Suspense>
  )
}
