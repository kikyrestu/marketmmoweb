import { getServerSession } from "next-auth"
import speakeasy from "speakeasy"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { token } = await req.json()
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.twoFactorSecret) {
    return new Response("2FA not setup", { status: 400 })
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
  })

  if (!verified) {
    return new Response("Invalid token", { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: true },
  })

  return Response.json({ verified: true })
}
