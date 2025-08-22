import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"


export async function GET() {
  try {
    // Connect to database
    await prisma.$connect()
    
    // Get raw items data
    const items = await prisma.item.findMany({
      include: {
        seller: true,
        category: true
      }
    })
    
    console.log("Raw items data:", JSON.stringify(items, null, 2))
    
    // Get simplified items for response
    const simplifiedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      seller: item.seller.name,
      category: item.category.name
    }))
    
    return NextResponse.json({
      status: "Success",
      itemCount: items.length,
      items: simplifiedItems,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Error fetching items:", error)
    return NextResponse.json({
      status: "Error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
