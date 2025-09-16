import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"


const dummyItems = [
  {
    name: "Legendary Sword",
    description: "A powerful sword with magical properties",
    price: 999.99,
    imageUrl: "/items/sword.jpg",
    categoryName: "Items"
  },
  {
    name: "Level 100 Account",
    description: "Fully leveled account with rare items",
    price: 1499.99,
    imageUrl: "/items/account.jpg",
    categoryName: "Accounts"
  },
  {
    name: "1000 Gold",
    description: "In-game currency, fast delivery",
    price: 49.99,
    imageUrl: "/items/gold.jpg",
    categoryName: "Currency"
  }
]

const dummyBlogPosts = [
  {
    title: "Welcome to the New Marketplace!",
    slug: "welcome-to-the-new-marketplace",
    excerpt: "Everything you need to know to get started with buying and selling.",
    content: "This is a full blog post about the marketplace. Here we can detail features, rules, and give tips to our users.",
    coverImageUrl: "/items/placeholder.svg",
    tags: ["announcement", "guide"],
  },
  {
    title: "Top 5 Rarest Items This Week",
    slug: "top-5-rarest-items-this-week",
    excerpt: "Check out the most sought-after items that landed on our marketplace recently.",
    content: "Full content detailing the 5 rare items, their history, and why they are so valuable. Lorem ipsum dolor sit amet.",
    coverImageUrl: "/items/placeholder.svg",
    tags: ["featured", "items"],
  }
]

export async function GET() {
  try {
    await prisma.$connect()

    // Create a test seller if none exists
    let seller = await prisma.user.findFirst({
      where: {
        role: "SELLER"
      }
    })

    if (!seller) {
      seller = await prisma.user.create({
        data: {
          email: "seller@test.com",
          name: "Test Seller",
          hashedPassword: "dummy-hash",
          role: "SELLER",
          verificationStatus: "VERIFIED"
        }
      })
    }

    // Create categories if they don't exist
    await prisma.category.createMany({
      data: [
        { name: "Accounts", description: "Game accounts for sale" },
        { name: "Items", description: "In-game items for sale" },
        { name: "Currency", description: "In-game currency for sale" },
        { name: "Services", description: "In-game services like power leveling" }
      ],
      skipDuplicates: true
    })

    // Create dummy items
    const createdItems = await Promise.all(
      dummyItems.map(async (item) => {
        const { categoryName, ...itemData } = item
        const category = await prisma.category.findUnique({
          where: { name: categoryName }
        })

        if (!category) throw new Error(`Category ${categoryName} not found`)

        return prisma.item.create({
          data: {
            ...itemData,
            sellerId: seller.id,
            categoryId: category.id
          }
        })
      })
    )

    // Create dummy blog posts
    await Promise.all(
      dummyBlogPosts.map(post => {
        return prisma.blogPost.upsert({
          where: { slug: post.slug },
          update: {},
          create: {
            ...post,
            authorId: seller.id,
            status: "PUBLISHED",
            publishedAt: new Date(),
          }
        })
      })
    )

    return NextResponse.json({
      message: "Test data created successfully",
      items: createdItems
    })
  } catch (error) {
    console.error("Error creating test data:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
