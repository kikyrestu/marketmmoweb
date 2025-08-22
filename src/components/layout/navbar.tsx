"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RoleBadge } from "@/components/role-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserCircle } from "lucide-react"

export function Navbar() {
  const { data: session } = useSession()

  const renderDashboardLink = () => {
    switch (session?.user?.role) {
      case "SELLER":
        return "/dashboard/seller"
      case "ADMIN":
        return "/admin"
      default:
        return "/dashboard"
    }
  }

  return (
    <nav className="border-b bg-background">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="font-bold">
          MMORPG Marketplace
        </Link>

        <div className="ml-auto flex items-center space-x-4">
      <Link href="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Community</Link>
      <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
      <Link href="/prices" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Prices</Link>
      <Link href="/streamers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Streamers</Link>
          {session ? (
            <>
              <Link href="/browse">
                <Button variant="ghost">Browse Items</Button>
              </Link>
              
              {session.user.role === "SELLER" && (
                <>
                  <Link href="/dashboard/seller">
                    <Button variant="ghost">Seller Dashboard</Button>
                  </Link>
                  <RoleBadge role={session.user.role} />
                </>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <UserCircle className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={renderDashboardLink()}>
                    <DropdownMenuItem>
                      Dashboard
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/transactions">
                    <DropdownMenuItem>
                      Transactions
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/profile">
                    <DropdownMenuItem>
                      Profile Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/auth/signin">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
