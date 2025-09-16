"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Settings2, Boxes, Users, MessagesSquare, HardDrive, FileText, ShieldCheck, KeySquare, FolderOpen, Settings } from 'lucide-react'
import clsx from 'clsx'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const items: NavItem[] = [
  { label: 'Dasbor', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Kolom Dinamis', href: '/admin/fields', icon: Settings2 },
  { label: 'Barang', href: '/admin/items', icon: Boxes },
  { label: 'Ruang Komunitas', href: '/admin/community-rooms', icon: MessagesSquare },
  {
    label: 'Escrow',
    href: '/admin/escrow',
    icon: ShieldCheck,
    children: [
      { label: 'Kasus', href: '/admin/escrow', icon: ShieldCheck },
      { label: 'Pengaturan', href: '/admin/escrow/settings', icon: Settings }
    ]
  },
  { label: 'Pengguna', href: '/admin/users', icon: Users },
  { label: 'Penyimpanan', href: '/admin/storage', icon: HardDrive },
  { label: 'Blog', href: '/admin/blog', icon: FileText },
  { label: 'Streamer', href: '/admin/streamers', icon: Users },
  { label: 'Pengelola File', href: '/admin/filemanager', icon: FolderOpen },
  { label: 'Peran', href: '/admin/roles', icon: KeySquare },
]

export function AdminNav() {
  const pathname = usePathname()

  const renderNavItem = (item: NavItem, level = 0) => {
    const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
    const hasChildren = item.children && item.children.length > 0
    const Icon = item.icon

    return (
      <div key={item.href}>
        <Link
          href={item.href}
          className={clsx(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent',
            level > 0 && 'ml-4'
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
        </Link>
        {hasChildren && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <nav className="flex flex-col gap-1 p-2">
      {items.map(item => renderNavItem(item))}
    </nav>
  )
}
