import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"


export async function GET(
  request: Request,
  context: any
) {
  try {
    const params = context?.params as { id: string }
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Get transaction with related data
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 }
      )
    }

    // Check if user is either the buyer or seller
    if (
      transaction.buyerId !== user.id &&
      transaction.sellerId !== user.id
    ) {
      return NextResponse.json(
        { message: "Not authorized to view this transaction" },
        { status: 403 }
      )
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
