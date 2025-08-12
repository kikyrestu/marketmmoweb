import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    // This endpoint will be used to update session
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { message: "No session found" },
        { status: 404 }
      )
    }

    // Get fresh role from DB
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
      select: { role: true }
    })

    return NextResponse.json({ success: true, role: user?.role })
  } catch (error) {
    console.error("Error in manual session refresh:", error)
    return NextResponse.json(
      { message: "Error refreshing session" },
      { status: 500 }
    )
  }
}
