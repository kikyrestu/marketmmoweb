import React from 'react'

export type EscrowAuditLog = {
  id: string
  action: string
  meta?: any
  createdById: string
  createdAt: string
}

export function EscrowLogPanel({ logs }: { logs: EscrowAuditLog[] }) {
  if (!logs?.length) return <div className="text-xs text-gray-400">No escrow activity yet.</div>
  return (
    <div className="space-y-2">
      {logs.map(log => (
        <div key={log.id} className="text-xs border-b pb-1">
          <span className="font-bold mr-2">{log.action}</span>
          <span className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
          {log.meta && <span className="ml-2 text-gray-700">{JSON.stringify(log.meta)}</span>}
        </div>
      ))}
    </div>
  )
}
