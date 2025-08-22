import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  console.log("Middleware running for path:", request.nextUrl.pathname);
  console.log("Cookies in request:", request.headers.get('cookie'));
  
  // Check if the path is a seller route
  if (request.nextUrl.pathname.startsWith('/dashboard/seller')) {
    try {
      // Get token with explicit secret
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        raw: false
      });
      
      console.log("Token in middleware:", token);
      
      // No token means not authenticated
      if (!token) {
        console.log("No token found, redirecting to signin");
        return NextResponse.redirect(new URL("/auth/signin", request.url));
      }

      // Require OTP verification if enabled
      if (token.twoFactorEnabled && !token.twoFactorVerified) {
        console.log("2FA not verified, redirecting to signin");
        return NextResponse.redirect(new URL("/auth/signin", request.url));
      }

      // Check if user has SELLER role
      if (token.role !== "SELLER") {
        console.log("User is not a seller, redirecting to dashboard");
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      
      console.log("Access granted to seller route");
    } catch (error) {
      console.error("Error in middleware:", error);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/seller/:path*",
  ]
}
