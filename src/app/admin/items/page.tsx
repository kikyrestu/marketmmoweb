import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import ItemModerationTable from './ItemModerationTable';

export const dynamic = 'force-dynamic';

async function getItems() {
  return await prisma.item.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, price: true, createdAt: true, sellerId: true, isAvailable: true }
  });
}

export default async function AdminItemsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/signin?callbackUrl=/admin/items');
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } });
  const allowed = await isAdmin(me?.role);
  if (!allowed) redirect('/auth/admin');

  const items = await getItems();
  return (
    <ItemModerationTable items={items} />
  );
}
