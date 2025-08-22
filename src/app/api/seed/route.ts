import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"


const initialCategories = [
  {
    name: "Accounts",
    description: "Game accounts for sale"
  },
  {
    name: "Items",
    description: "In-game items for sale"
  },
  {
    name: "Currency",
    description: "In-game currency for sale"
  },
  {
    name: "Services",
    description: "In-game services like power leveling"
  }
]

export async function GET() {
  try {
    const categories = await Promise.all(
      initialCategories.map(async (category) => {
        return prisma.category.upsert({
          where: { name: category.name },
          update: {},
          create: {
            name: category.name,
            description: category.description
          }
        })
      })
    )

    return NextResponse.json({
      message: "Categories seeded successfully",
      categories
    })
  } catch (error) {
    console.error("Error seeding categories:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
