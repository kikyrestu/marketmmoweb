import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

function requireAdmin(role?: string | null) {
  return role === 'ADMIN'
}

const SETTINGS_FILE = path.join(process.cwd(), 'escrow-settings.json')

interface EscrowSettings {
  id: string
  feePercentage: number
  feeFixed: number
  minAmount: number
  maxAmount: number
  enabled: boolean
  autoApprove: boolean
  disputeWindowDays: number
  termsAndConditions: string
  updatedAt: string
}

function getDefaultSettings(): EscrowSettings {
  return {
    id: 'default',
    feePercentage: 2.5, // 2.5%
    feeFixed: 1000, // Rp 1,000
    minAmount: 10000, // Rp 10,000
    maxAmount: 10000000, // Rp 10,000,000
    enabled: true,
    autoApprove: false,
    disputeWindowDays: 7,
    termsAndConditions: `Syarat dan Ketentuan Rekber:

1. Rekber adalah sistem jaminan untuk transaksi jual beli
2. Biaya rekber akan ditambahkan ke total pembayaran
3. Dana akan ditahan sampai kedua belah pihak setuju
4. Sengketa dapat dilaporkan dalam waktu 7 hari
5. Admin berhak memutuskan dalam kasus sengketa`,
    updatedAt: new Date().toISOString()
  }
}

function loadSettings(): EscrowSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Failed to load escrow settings:', error)
  }
  return getDefaultSettings()
}

function saveSettings(settings: EscrowSettings): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('Failed to save escrow settings:', error)
    throw new Error('Failed to save settings')
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!requireAdmin((session.user as any).role)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const settings = loadSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[ESCROW_SETTINGS_GET]', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!requireAdmin((session.user as any).role)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const {
      feePercentage,
      feeFixed,
      minAmount,
      maxAmount,
      enabled,
      autoApprove,
      disputeWindowDays,
      termsAndConditions
    } = body

    // Validate input
    if (typeof feePercentage !== 'number' || feePercentage < 0 || feePercentage > 10) {
      return NextResponse.json({ message: 'Invalid fee percentage' }, { status: 400 })
    }
    if (typeof feeFixed !== 'number' || feeFixed < 0) {
      return NextResponse.json({ message: 'Invalid fixed fee' }, { status: 400 })
    }
    if (typeof minAmount !== 'number' || minAmount < 0) {
      return NextResponse.json({ message: 'Invalid minimum amount' }, { status: 400 })
    }
    if (typeof maxAmount !== 'number' || maxAmount < minAmount) {
      return NextResponse.json({ message: 'Invalid maximum amount' }, { status: 400 })
    }
    if (typeof disputeWindowDays !== 'number' || disputeWindowDays < 1 || disputeWindowDays > 30) {
      return NextResponse.json({ message: 'Invalid dispute window days' }, { status: 400 })
    }

    const settings: EscrowSettings = {
      id: 'default',
      feePercentage,
      feeFixed,
      minAmount,
      maxAmount,
      enabled: Boolean(enabled),
      autoApprove: Boolean(autoApprove),
      disputeWindowDays,
      termsAndConditions: termsAndConditions || '',
      updatedAt: new Date().toISOString()
    }

    saveSettings(settings)

    return NextResponse.json({
      settings,
      message: 'Escrow settings updated successfully'
    })
  } catch (error) {
    console.error('[ESCROW_SETTINGS_POST]', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
