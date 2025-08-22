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

    // Get item
    const item = await prisma.item.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        _count: {
          select: {
            transactions: true
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

    // Check if user owns the item
    if (item.sellerId !== user.id) {
      return NextResponse.json(
        { message: "You don't have permission to access this item" },
        { status: 403 }
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

export async function PATCH(
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
        { message: "Only sellers can update items" },
        { status: 403 }
      )
    }

    // Get item
    const item = await prisma.item.findUnique({
      where: { id: params.id }
    })

    if (!item) {
      return NextResponse.json(
        { message: "Item not found" },
        { status: 404 }
      )
    }

    // Check if user owns the item
    if (item.sellerId !== user.id) {
      return NextResponse.json(
        { message: "You don't have permission to update this item" },
        { status: 403 }
      )
    }

    const updates = await request.json()

    // Validate price if provided
    if (updates.price && (isNaN(updates.price) || updates.price <= 0)) {
      return NextResponse.json(
        { message: "Invalid price" },
        { status: 400 }
      )
    }

    // Validate category if provided
    if (updates.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: updates.categoryId }
      })

      if (!category) {
        return NextResponse.json(
          { message: "Invalid category" },
          { status: 400 }
        )
      }
    }

    // Update item
    const updatedItem = await prisma.item.update({
      where: { id: params.id },
      data: updates,
      include: {
        category: true
      }
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error("Error updating item:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
        { message: "Only sellers can delete items" },
        { status: 403 }
      )
    }

    // Get item
    const item = await prisma.item.findUnique({
      where: { id: params.id }
    })

    if (!item) {
      return NextResponse.json(
        { message: "Item not found" },
        { status: 404 }
      )
    }

    // Check if user owns the item
    if (item.sellerId !== user.id) {
      return NextResponse.json(
        { message: "You don't have permission to delete this item" },
        { status: 403 }
      )
    }

    // Delete item
    await prisma.item.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting item:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
