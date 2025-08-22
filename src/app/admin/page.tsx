import { redirect } from 'next/navigation'

export default async function AdminHomePage() {
  redirect('/admin/dashboard')
}
