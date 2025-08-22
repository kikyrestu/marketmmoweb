import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcrypt"
import { prisma } from '@/lib/prisma'

// Hapus instansiasi PrismaClient langsung; gunakan singleton prisma

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
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
          console.log('[AUTH] Login success', email, 'role=', user.role)
          return { id: user.id, email: user.email, name: user.name, role: user.role }
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
        return { ...token, id: user.id, role: (user as any).role }
      }
      if (trigger === "update" && session) {
        return { ...token, ...session }
      }
      try {
        if (token.email) {
          const latestUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true }
          })
          if (latestUser && latestUser.role !== token.role) {
            return { ...token, role: latestUser.role }
          }
        }
      } catch (e) {
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
          role: token.role
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
