import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { VerificationBadge } from "@/components/ui/verification-badge"

interface ItemCardProps {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string | null
  isAvailable: boolean
  seller: {
    name: string
    verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | null
  }
}

export function ItemCard({
  id,
  name,
  description,
  price,
  imageUrl,
  isAvailable,
  seller,
}: ItemCardProps) {
  return (
    <Card className="overflow-hidden">
      {imageUrl && (
        <div className="aspect-square relative">
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold truncate">{name}</h3>
          <Badge variant={isAvailable ? "default" : "secondary"}>
            {isAvailable ? "Available" : "Sold"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-muted-foreground">{seller.name}</p>
          <VerificationBadge isVerified={seller.verificationStatus === "VERIFIED"} />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
        <p className="mt-2 font-medium">
          ${price.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">
          Sold by {seller.name}
        </p>
      </CardContent>
      <CardFooter className="p-4">
        <Link href={`/items/${id}`} className="w-full">
          <Button className="w-full" disabled={!isAvailable}>
            {isAvailable ? "View Details" : "Sold Out"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
