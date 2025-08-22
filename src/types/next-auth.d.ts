import { UserRole } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string
      role: UserRole
      twoFactorEnabled?: boolean
      twoFactorVerified?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: UserRole
    twoFactorEnabled?: boolean
    twoFactorVerified?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: UserRole
    twoFactorEnabled?: boolean
    twoFactorVerified?: boolean
  }
}
