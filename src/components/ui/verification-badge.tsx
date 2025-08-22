import { cn } from "@/lib/utils"
import { CreditCard } from "lucide-react"

interface VerificationBadgeProps {
  isVerified: boolean
  className?: string
}

export function VerificationBadge({ isVerified, className }: VerificationBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center",
        className
      )}
      title={isVerified ? "Penjual Terverifikasi" : "Penjual Belum Terverifikasi"}
    >
      <CreditCard
        className={cn(
          "h-4 w-4",
          isVerified ? "text-green-500" : "text-gray-400"
        )}
      />
    </div>
  )
}
