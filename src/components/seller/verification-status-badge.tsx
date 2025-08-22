import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface VerificationStatusBadgeProps {
  status: "PENDING" | "VERIFIED" | "REJECTED"
  className?: string
}

export function VerificationStatusBadge({ 
  status, 
  className 
}: VerificationStatusBadgeProps) {
  const variants = {
    PENDING: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80",
    VERIFIED: "bg-green-100 text-green-800 hover:bg-green-100/80",
    REJECTED: "bg-red-100 text-red-800 hover:bg-red-100/80"
  }

  return (
    <Badge 
      variant="secondary" 
      className={cn(variants[status], className)}
    >
      {status}
    </Badge>
  )
}
