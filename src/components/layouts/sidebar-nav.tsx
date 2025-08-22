"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useChatRealtime } from "@/components/chat-realtime-provider"
import { useMemo } from 'react'

interface SidebarNavProps {
  items: {
    title: string
    href: string
  }[]
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname()
  const chatCtx = useChatRealtime()
  const conversationUpdates = (chatCtx && (chatCtx as any).conversationUpdates) || {}
  const unreadTotal = useMemo(
    () => Object.values(conversationUpdates as Record<string, any>).reduce((acc, v: any) => acc + (v?.unreadCount || 0), 0),
    [conversationUpdates]
  )

  return (
    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
      {items.map((item) => {
        const active = pathname === item.href
        const showBadge = item.href === '/conversations' && unreadTotal > 0
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground gap-2",
              active ? "bg-accent text-accent-foreground" : "transparent"
            )}
          >
            <span>{item.title}</span>
            {showBadge && (
              <span className="ml-auto inline-flex min-w-[1.25rem] justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
