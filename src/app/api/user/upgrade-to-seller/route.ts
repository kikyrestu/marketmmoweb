import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Extract skipVerification flag from request body
    const { skipVerification = false } = await req.json()

    // Update user role to SELLER in the database
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { 
        role: "SELLER",
        // If skipping verification, mark as verified
        isVerified: skipVerification ? true : false,
        verificationStatus: skipVerification ? "VERIFIED" : null
      },
    })

    return NextResponse.json(
      { 
        message: "Successfully upgraded to seller", 
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
          verificationStatus: updatedUser.verificationStatus
        }
      }, 
      { status: 200 }
    )
  } catch (error) {
    console.error("Error upgrading to seller:", error)
    return NextResponse.json(
      { message: "Failed to upgrade to seller" },
      { status: 500 }
    )
  }
}
