import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"


export async function GET() {
  try {
    await prisma.$connect() // Make sure we're connected to DB

    // First check if we have any categories
    const categoriesExist = await prisma.category.count() > 0
    if (!categoriesExist) {
      console.log('No categories found, creating default categories')
      await prisma.category.createMany({
        data: [
          { name: "Accounts", description: "Game accounts for sale" },
          { name: "Items", description: "In-game items for sale" },
          { name: "Currency", description: "In-game currency for sale" },
          { name: "Services", description: "In-game services like power leveling" }
        ],
        skipDuplicates: true
      })
    }

    const items = await prisma.item.findMany({
      where: {
        isAvailable: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
        createdAt: true,
        updatedAt: true,
        seller: {
          select: {
            id: true,
            name: true,
            role: true,
            verificationStatus: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Log the items for debugging
    console.log('Found items:', items.length)
    
    // Make sure we return a valid array
    return new NextResponse(JSON.stringify(items || []), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error("Error fetching items:", error)
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
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "SELLER") {
      return new NextResponse("Only sellers can add items", { status: 403 })
    }

    let name: string | undefined
    let description: string | undefined
    let price: number | undefined
    let imageUrl: string | undefined
    let categoryId: string | undefined

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      name = formData.get('name') as string
      description = formData.get('description') as string
      const priceStr = formData.get('price') as string
      price = priceStr ? Number(priceStr) : undefined
      categoryId = formData.get('categoryId') as string | undefined
      const file = formData.get('image') as File | null
      if (file && file.size > 0) {
        // Save file to public/uploads
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const ext = file.type.split('/')[1] || 'png'
        const fileName = `item-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const fs = await import('fs')
        const path = await import('path')
        const uploadDir = path.join(process.cwd(), 'public', 'uploads')
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
        const filePath = path.join(uploadDir, fileName)
        fs.writeFileSync(filePath, buffer)
        imageUrl = `/uploads/${fileName}`
      }
    } else {
      const json = await request.json()
      name = json.name
      description = json.description
      price = json.price
      imageUrl = json.imageUrl
      categoryId = json.categoryId
    }

    if (!name || name.trim() === "") {
      return new NextResponse("Name is required", { status: 400 })
    }

    if (!description || description.trim() === "") {
      return new NextResponse("Description is required", { status: 400 })
    }

  if (!price || price <= 0) {
      return new NextResponse("Price must be greater than 0", { status: 400 })
    }

    // If no category is specified, use the default "Items" category
    let itemCategory = null
    if (categoryId) {
      itemCategory = await prisma.category.findUnique({
        where: { id: categoryId }
      })
    }
    
    if (!itemCategory) {
      itemCategory = await prisma.category.findFirst({
        where: { name: "Items" }
      })
    }

    if (!itemCategory) {
      return new NextResponse("Default category not found", { status: 500 })
    }

    const seller = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!seller) {
      return new NextResponse("Seller not found", { status: 404 })
    }

    const createData = {
      name: name.trim(),
      description: description.trim(),
      price,
      imageUrl: imageUrl?.trim(),
      isAvailable: true as const,
      seller: { connect: { id: seller.id } },
      category: { connect: { id: itemCategory.id } }
    }

    const item = await prisma.item.create({
      data: createData,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            role: true,
            verificationStatus: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error("[ITEMS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
