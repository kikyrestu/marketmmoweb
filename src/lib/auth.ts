import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import { compare } from "bcrypt"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.hashedPassword
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      console.log("JWT Callback:", { token, user, trigger, session });
      
      // Initial sign in - add user data to token
      if (user) {
        console.log("User data available, updating token", user);
        return {
          ...token,
          id: user.id,
          role: user.role
        }
      }

      // Update token if session is updated
      if (trigger === "update" && session) {
        console.log("Session update detected", session);
        return {
          ...token,
          ...session
        }
      }

      // Make sure we always return the latest data by fetching from DB
      try {
        console.log("Checking for latest user data");
        const latestUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, role: true }
        });
        
        if (latestUser && latestUser.role !== token.role) {
          console.log("User role changed, updating token", latestUser);
          return {
            ...token,
            role: latestUser.role
          };
        }
      } catch (error) {
        console.error("Error fetching latest user data:", error);
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
  }
}
