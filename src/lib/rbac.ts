import { prisma } from '@/lib/prisma'

export async function getAssignments(userId: string) {
  return (prisma as any).userRoleAssignment.findMany({ where: { userId } })
}

export async function isAdmin(baseRole?: string) {
  return baseRole === 'ADMIN'
}

export async function hasRole(userId: string, role: 'ADMIN' | 'SELLER' | 'USER', scope?: string) {
  const ass = await getAssignments(userId)
  return ass.some((a: any) => a.role === role && (scope ? a.scope === scope : true))
}

export async function isEscrowAdmin(userId: string, baseRole?: string) {
  if (await isAdmin(baseRole)) return true
  return hasRole(userId, 'ADMIN', 'ESCROW')
}
