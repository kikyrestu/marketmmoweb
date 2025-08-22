import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcrypt"
import speakeasy from "speakeasy"
import { prisma } from '@/lib/prisma'

// Hapus instansiasi PrismaClient langsung; gunakan singleton prisma

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "One-Time Password", type: "text" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.warn('[AUTH] Missing email/password')
            return null
          }
          const email = credentials.email.trim().toLowerCase()
          const user = await prisma.user.findUnique({
            where: { email }
          })
          if (!user) {
            console.warn('[AUTH] User not found', email)
            return null
          }
          if (!user.hashedPassword) {
            console.error('[AUTH] User has no hashedPassword stored', email)
            return null
          }
          const ok = await compare(credentials.password, user.hashedPassword)
          if (!ok) {
            console.warn('[AUTH] Invalid password for', email)
            return null
          }

          if (user.twoFactorEnabled) {
            if (!credentials.otp) {
              throw new Error('OTP_REQUIRED')
            }
            const verified = speakeasy.totp.verify({
              secret: user.twoFactorSecret!,
              encoding: 'base32',
              token: credentials.otp
            })
            if (!verified) {
              throw new Error('INVALID_OTP')
            }
          }
          console.log('[AUTH] Login success', email, 'role=', user.role)
          return { id: user.id, email: user.email, name: user.name, role: user.role, twoFactorEnabled: user.twoFactorEnabled, twoFactorVerified: true }
        } catch (e) {
          console.error('[AUTH] Authorize error', e)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        return { ...token, id: user.id, role: (user as any).role, twoFactorEnabled: (user as any).twoFactorEnabled, twoFactorVerified: (user as any).twoFactorVerified }
      }
      if (trigger === "update" && session) {
        return { ...token, ...session }
      }
      try {
        if (token.email) {
          const latestUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true, twoFactorEnabled: true }
          })
          if (latestUser && (latestUser.role !== token.role || latestUser.twoFactorEnabled !== token.twoFactorEnabled)) {
            return { ...token, role: latestUser.role, twoFactorEnabled: latestUser.twoFactorEnabled }
          }
        }
      } catch {
        // swallow
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
          twoFactorEnabled: token.twoFactorEnabled,
          twoFactorVerified: token.twoFactorVerified
        }
      }
    }
  },
  pages: {
    signIn: "/auth/signin"
  },
  session: {
    strategy: "jwt",
    // 24 hours in seconds
    maxAge: 60 * 60 * 24,
    // Refresh JWT 'iat' after 15 minutes of activity to extend sliding window
    updateAge: 60 * 15
  },
  secret: process.env.NEXTAUTH_SECRET
}
