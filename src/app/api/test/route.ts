import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Hello! This is a test endpoint.",
    timestamp: new Date().toISOString()
  })
}
