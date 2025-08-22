import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { bootstrapStorage } from "@/lib/storage/bootstrap"
import { getPool } from "@/lib/storage/manager"


export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "File must be an image" },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "File size must be less than 5MB" },
        { status: 400 }
      )
    }

  // Upload via storage pool
  bootstrapStorage()
  const pool = getPool('VERIFICATION')
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = (file.type && file.type.includes('/')) ? file.type.split('/')[1] : (file.name.split('.').pop() || 'png')
  const filename = `${type}-${session.user.email}-${Date.now()}.${ext}`
  const key = `verification/${filename}`
  const put = await pool.put(key, buffer, file.type)
  const url = pool.visibility === 'public' ? (put.url || pool.getPublicUrl(put.key)) : null
  return NextResponse.json({ url, key: put.key })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
