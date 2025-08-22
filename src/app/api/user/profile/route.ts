import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse("Unauthorized", { status: 401 })

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) return new NextResponse("User not found", { status: 404 })

    return NextResponse.json({
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus
    })
  } catch (error) {
    console.error("[USER_PROFILE_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return new NextResponse("Unauthorized", { status: 401 })

    const body = await request.json()
    const { name } = body

    if (!name || name.trim() === "") {
      return new NextResponse("Name is required", { status: 400 })
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: { name: name.trim() }
    })

    return NextResponse.json({
      name: user.name,
      email: user.email,
      role: user.role
    })
  } catch (error) {
    console.error("[USER_PROFILE_PUT]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
