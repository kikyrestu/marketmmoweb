import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"


export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    let transactions

    // Fetch transactions based on user role
    if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
      transactions = await prisma.transaction.findMany({
        where: {
          buyerId: session.user.id
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              price: true,
              seller: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    } else if (session.user.role === "SELLER") {
      transactions = await prisma.transaction.findMany({
        where: {
          sellerId: session.user.id
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              price: true,
            }
          },
          seller: {
            select: {
              name: true
            }
          },
          buyer: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    } else {
      return NextResponse.json(
        { message: "Invalid user role" },
        { status: 400 }
      )
    }

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { itemId, quantity } = await request.json()

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

    // Get item and seller
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        seller: true
      }
    })

    if (!item) {
      return NextResponse.json(
        { message: "Item not found" },
        { status: 404 }
      )
    }

    if (!item.isAvailable) {
      return NextResponse.json(
        { message: "Item is no longer available" },
        { status: 400 }
      )
    }

    if (item.sellerId === user.id) {
      return NextResponse.json(
        { message: "You cannot buy your own item" },
        { status: 400 }
      )
    }

    // Calculate total price
    const totalPrice = item.price * quantity

    // Create transaction in a transaction to ensure atomicity
    const transaction = await prisma.$transaction(async (tx) => {
      // Create the transaction
      const newTransaction = await tx.transaction.create({
        data: {
          itemId: item.id,
          buyerId: user.id,
          sellerId: item.sellerId,
          quantity,
          totalPrice,
          status: "PENDING"
        }
      })

      // Update item availability
      await tx.item.update({
        where: { id: item.id },
        data: { isAvailable: false }
      })

      return newTransaction
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}