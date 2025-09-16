'use server'

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function createPost(prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { message: 'Unauthorized' };
  }
  const title = (formData.get('title') as string)?.trim();
  const slug = ((formData.get('slug') as string) || (title || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')).trim();
  const excerpt = (formData.get('excerpt') as string) || undefined;
  const content = (formData.get('content') as string) || '';
  const tagsStr = (formData.get('tags') as string) || '';
  const tags = tagsStr ? tagsStr.split(',').map(t=>t.trim()).filter(Boolean) : [];
  const statusRaw = (formData.get('status') as string) || 'DRAFT';
  const status = (['DRAFT','PUBLISHED','ARCHIVED'].includes(statusRaw.toUpperCase()) ? statusRaw.toUpperCase() : 'DRAFT');
  const coverImageUrl = (formData.get('coverImageUrl') as string) || undefined;

  if (!title) return { message: 'Title required' };
  if (!content || !content.trim()) return { message: 'Content required' };
  // unique slug
  const existing = await prisma.blogPost.findUnique({ where: { slug } });
  if (existing) return { message: 'Slug already used' };

  await prisma.blogPost.create({
    data: {
      title: title.trim(),
      slug,
      excerpt: excerpt?.trim() || null,
      content: content.trim(),
      coverImageUrl: coverImageUrl?.trim() || null,
      tags,
  status: status as any,
      authorId: session.user.id,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
    }
  });

  // Send notifications to all users when blog post is published
  if (status === 'PUBLISHED') {
    try {
      // Get all users except the author
      const users = await prisma.user.findMany({
        where: {
          id: { not: session.user.id }
        },
        select: { id: true }
      });

      // For now, we'll create notifications in memory
      // Later this will be replaced with database notifications
      const { notifyBlogPost } = await import('@/lib/notification-helpers');
      for (const user of users) {
        await notifyBlogPost(user.id, title, slug);
      }
    } catch (error) {
      console.error('Failed to send blog notifications:', error);
      // Don't fail the blog creation if notifications fail
    }
  }

  return { message: 'OK' };
}

export async function getBlogPost(id: string) {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  return post;
}

export async function updatePost(prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { message: 'Unauthorized' };
  }
  const id = formData.get('id') as string;
  if (!id) return { message: 'Missing blog id' };
  const title = (formData.get('title') as string)?.trim();
  const slug = ((formData.get('slug') as string) || (title || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')).trim();
  const excerpt = (formData.get('excerpt') as string) || undefined;
  const content = (formData.get('content') as string) || '';
  const tagsStr = (formData.get('tags') as string) || '';
  const tags = tagsStr ? tagsStr.split(',').map(t=>t.trim()).filter(Boolean) : [];
  const statusRaw = (formData.get('status') as string) || 'DRAFT';
  const status = (['DRAFT','PUBLISHED','ARCHIVED'].includes(statusRaw.toUpperCase()) ? statusRaw.toUpperCase() : 'DRAFT');
  const coverImageUrl = (formData.get('coverImageUrl') as string) || undefined;

  if (!title) return { message: 'Title required' };
  if (!content || !content.trim()) return { message: 'Content required' };

  await prisma.blogPost.update({
    where: { id },
    data: {
      title: title.trim(),
      slug,
      excerpt: excerpt?.trim() || null,
      content: content.trim(),
      coverImageUrl: coverImageUrl?.trim() || null,
      tags,
      status: status as any,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
    }
  });
  return { message: 'OK' };
}
