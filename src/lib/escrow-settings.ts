import fs from 'fs'
import path from 'path'

export interface EscrowSettings {
  id: string
  feePercentage: number
  feeFixed: number
  minAmount: number
  maxAmount: number
  enabled: boolean
  autoApprove: boolean
  disputeWindowDays: number
  updatedAt: string
}

const SETTINGS_FILE = path.join(process.cwd(), 'escrow-settings.json')

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
    updatedAt: new Date().toISOString()
  }
}

export function loadEscrowSettings(): EscrowSettings {
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

export function calculateEscrowFee(amount: number): { fee: number; totalAmount: number } {
  const settings = loadEscrowSettings()

  // Calculate percentage fee
  const percentageFee = (amount * settings.feePercentage) / 100

  // Add fixed fee
  const totalFee = percentageFee + settings.feeFixed

  // Total amount = original amount + fee
  const totalAmount = amount + totalFee

  return {
    fee: Math.round(totalFee),
    totalAmount: Math.round(totalAmount)
  }
}

export function validateEscrowAmount(amount: number): { valid: boolean; message?: string } {
  const settings = loadEscrowSettings()

  if (!settings.enabled) {
    return { valid: false, message: 'Escrow system is currently disabled' }
  }

  if (amount < settings.minAmount) {
    return { valid: false, message: `Minimum escrow amount is Rp ${settings.minAmount.toLocaleString()}` }
  }

  if (amount > settings.maxAmount) {
    return { valid: false, message: `Maximum escrow amount is Rp ${settings.maxAmount.toLocaleString()}` }
  }

  return { valid: true }
}
