import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"


export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Get database stats
    const dbStats = {
      categories: await prisma.category.count(),
      items: await prisma.item.count(),
      users: await prisma.user.count()
    }
    
    console.log("Database connection successful", dbStats)
    
    return NextResponse.json({
      status: "Connected",
      stats: dbStats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Database connection error:", error)
    return NextResponse.json({
      status: "Error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
