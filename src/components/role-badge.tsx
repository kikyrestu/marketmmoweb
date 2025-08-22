import { Badge } from "@/components/ui/badge"
import { cva } from "class-variance-authority"

const roleBadgeVariants = cva(
  "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      role: {
        SELLER: "bg-blue-50 text-blue-700 ring-blue-600/20",
        BUYER: "bg-gray-50 text-gray-600 ring-gray-500/20",
        ADMIN: "bg-purple-50 text-purple-700 ring-purple-600/20",
      },
    },
    defaultVariants: {
      role: "BUYER",
    },
  }
)

interface RoleBadgeProps {
  role: "SELLER" | "BUYER" | "ADMIN"
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const labels = {
    SELLER: "Seller Mode",
    BUYER: "Buyer Mode",
    ADMIN: "Admin Mode",
  }

  return (
    <Badge variant="outline" className={roleBadgeVariants({ role })}>
      {labels[role]}
    </Badge>
  )
}
