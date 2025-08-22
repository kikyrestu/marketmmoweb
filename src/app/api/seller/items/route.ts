import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"


export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    if (user.role !== "SELLER") {
      return NextResponse.json(
        { message: "Only sellers can access this endpoint" },
        { status: 403 }
      )
    }

    // Get seller's items
    const items = await prisma.item.findMany({
      where: {
        sellerId: user.id
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        _count: {
          select: {
            transactions: true
          }
        }
      }
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("Error fetching seller items:", error)
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    if (user.role !== "SELLER") {
      return NextResponse.json(
        { message: "Only sellers can create items" },
        { status: 403 }
      )
    }

    const { name, description, price, categoryId, imageUrl } = await request.json()

    // Validate required fields
    if (!name || !description || !price || !categoryId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate price
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { message: "Invalid price" },
        { status: 400 }
      )
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    })

    if (!category) {
      return NextResponse.json(
        { message: "Invalid category" },
        { status: 400 }
      )
    }

    // Create item
    const item = await prisma.item.create({
      data: {
        name,
        description,
        price,
        imageUrl,
        sellerId: user.id,
        categoryId,
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error("Error creating item:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
