import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"


export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { sellerVerification: true }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Check if user already has a pending verification
    if (user.sellerVerification?.status === "PENDING") {
      return NextResponse.json(
        { message: "You already have a pending verification request" },
        { status: 400 }
      )
    }

    const data = await request.json()

    // Create seller verification
    const verification = await prisma.sellerVerification.create({
      data: {
        fullName: data.fullName,
        birthDate: new Date(data.birthDate),
        address: data.address,
        phoneNumber: data.phoneNumber,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        bankHolder: data.bankHolder,
        ktpUrl: data.ktpUrl,
        selfieUrl: data.selfieUrl,
        bankProofUrl: data.bankProofUrl,
        userId: user.id
      }
    })

    return NextResponse.json({
      message: "Verification submitted successfully",
      verification
    })
  } catch (error) {
    console.error("Error submitting verification:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
