import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"


export async function GET(
  request: Request,
  context: any
) {
  try {
    const params = context?.params as { id: string }
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
        createdAt: true,
        seller: {
          select: {
            id: true,
            name: true,
            verificationStatus: true,
          }
        }
      }
    })

    if (!item) {
      return NextResponse.json(
        { message: "Item not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error("Error fetching item:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
