import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    if (user.role !== "SELLER") {
      return new NextResponse("User is not a seller", { status: 400 })
    }

    // Update user role to USER
    await prisma.user.update({
      where: { email: session.user.email },
      data: { 
        role: UserRole.USER,
        isVerified: false,
        verificationStatus: null
      }
    })

    return NextResponse.json({ message: "Successfully downgraded to buyer" })
  } catch (error) {
    console.error("[SELLER_DOWNGRADE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}