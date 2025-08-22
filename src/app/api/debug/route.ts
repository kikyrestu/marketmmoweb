import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"


export async function GET() {
  console.log('🔍 Debug endpoint called')
  
  try {
    // Test database connection
    console.log('🔌 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Get database stats
    console.log('📊 Getting database stats...')
    const stats = {
      categories: await prisma.category.count(),
      items: await prisma.item.count(),
      users: await prisma.user.count()
    }
    console.log('📈 Database stats:', stats)
    
    // Get a sample of each table
    console.log('🔍 Getting sample data...')
    const [categories, items] = await Promise.all([
      prisma.category.findMany({ take: 1 }),
      prisma.item.findMany({ take: 1 })
    ])
    
    return NextResponse.json({
      message: "Debug info retrieved successfully",
      stats,
      samples: {
        categories,
        items
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    return NextResponse.json({
      status: "Error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    })
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Database disconnected')
  }
}
