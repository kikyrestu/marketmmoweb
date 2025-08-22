"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Store } from "lucide-react"
import { useRouter } from "next/navigation"

interface SellerMenuProps {
  isVerified: boolean
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | null
}

export function SellerMenu({ isVerified, verificationStatus }: SellerMenuProps) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto">
          <Store className="mr-2 h-4 w-4" />
          Seller Menu
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {isVerified ? (
          <DropdownMenuItem onClick={() => router.push("/dashboard/seller")}>
            Seller Dashboard
          </DropdownMenuItem>
        ) : (
          <>
            {verificationStatus === "PENDING" ? (
              <DropdownMenuItem onClick={() => router.push("/dashboard/verification-status")}>
                Check Verification Status
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => router.push("/dashboard/seller-verification")}>
                Become a Seller
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
