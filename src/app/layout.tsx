import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { AuthProvider } from "@/components/providers/auth-provider"
import { ToastProvider } from "@/components/toaster"
import { ChatRealtimeProvider } from "@/components/chat-realtime-provider"
import { NotificationProvider } from "@/components/notification-provider"

const geist = Geist({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "MMORPG Marketplace",
  description: "Buy and sell MMORPG items",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <AuthProvider>
          <ChatRealtimeProvider>
            <NotificationProvider>
              <div className="relative flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <ToastProvider />
            </NotificationProvider>
          </ChatRealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
