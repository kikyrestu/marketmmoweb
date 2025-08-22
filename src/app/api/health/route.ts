import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"


export async function GET() {
  try {
    // Try to connect to the database
    await prisma.$connect()
    
    // Get some basic stats
    const stats = {
      categories: await prisma.category.count(),
      items: await prisma.item.count(),
      users: await prisma.user.count()
    }
    
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      stats
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json({
      status: "error",
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error"
    }, {
      status: 500
    })
  } finally {
    await prisma.$disconnect()
  }
}
