import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/rbac';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
}

export default async function UsersAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/signin?callbackUrl=/admin/users');
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } });
  const allowed = await isAdmin(me?.role);
  if (!allowed) redirect('/auth/admin');

  const users = await getUsers();
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Pengelolaan Pengguna</h1>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-muted-foreground text-left">
            <th className="py-2 px-2">Nama</th>
            <th className="py-2 px-2">Email</th>
            <th className="py-2 px-2">Peran</th>
            <th className="py-2 px-2">Dibuat Pada</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b">
              <td className="py-2 px-2">{u.name || '-'}</td>
              <td className="py-2 px-2">{u.email}</td>
              <td className="py-2 px-2">{u.role}</td>
              <td className="py-2 px-2">{new Date(u.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
