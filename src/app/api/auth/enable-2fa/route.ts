import { getServerSession } from "next-auth"
import speakeasy from "speakeasy"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const secret = speakeasy.generateSecret({ length: 20 })
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false,
    },
  })

  return Response.json({ secret: secret.base32, otpauthUrl: secret.otpauth_url })
}
