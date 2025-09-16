import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const streamer = await prisma.streamer.findUnique({ where: { id } });
    return NextResponse.json(streamer);
  }
  const streamers = await prisma.streamer.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, platform: true, url: true, status: true, bio: true, avatarUrl: true }
  });
  return NextResponse.json(streamers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { name, platform, url, status, bio, avatarUrl } = await req.json();
  if (!name || !platform || !url) return NextResponse.json({ message: 'Missing field' }, { status: 400 });
  const created = await prisma.streamer.create({
    data: { name, platform, url, status: status || 'ACTIVE', bio, avatarUrl }
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id, name, platform, url, status, bio, avatarUrl } = await req.json();
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });
  const updated = await prisma.streamer.update({
    where: { id },
    data: { name, platform, url, status, bio, avatarUrl }
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });
  await prisma.streamer.delete({ where: { id } });
  return NextResponse.json({ message: 'OK' });
}
