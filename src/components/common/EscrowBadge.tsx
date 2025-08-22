import React from 'react'

export type EscrowStatus = 'INIT' | 'FUNDS_HELD' | 'RELEASED' | 'REFUNDED' | 'DISPUTE' | 'RESOLVED'

const statusColor: Record<EscrowStatus, string> = {
  INIT: 'bg-gray-300 text-gray-800',
  FUNDS_HELD: 'bg-blue-300 text-blue-900',
  RELEASED: 'bg-green-300 text-green-900',
  REFUNDED: 'bg-yellow-300 text-yellow-900',
  DISPUTE: 'bg-red-300 text-red-900',
  RESOLVED: 'bg-green-400 text-green-900',
}

export function EscrowBadge({ status }: { status: EscrowStatus }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-bold ${statusColor[status]}`}>Escrow: {status}</span>
  )
}
