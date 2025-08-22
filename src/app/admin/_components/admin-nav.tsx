"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings2, Boxes, Users, MessagesSquare, HardDrive, FileText, ShieldCheck, KeySquare } from 'lucide-react'
import clsx from 'clsx'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const items: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Dynamic Fields', href: '/admin/fields', icon: Settings2 },
  { label: 'Items', href: '/admin/items', icon: Boxes },
  { label: 'Community Rooms', href: '/admin/community-rooms', icon: MessagesSquare },
  { label: 'Escrow', href: '/admin/escrow', icon: ShieldCheck },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Storage', href: '/admin/storage', icon: HardDrive },
  { label: 'Blog', href: '/admin/blog', icon: FileText },
  { label: 'Roles', href: '/admin/roles', icon: KeySquare },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1 p-2">
      {items.map(item => {
        const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
