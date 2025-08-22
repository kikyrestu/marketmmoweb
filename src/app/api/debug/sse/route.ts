import { NextResponse } from 'next/server'

export function GET() {
	return NextResponse.json({ message: 'Disabled in production build' }, { status: 404 })
}

