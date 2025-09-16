import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const data = await request.formData();
  const file = data.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'application/pdf', 'image/jpg'
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only images and PDF allowed' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name}`;
  const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
  fs.writeFileSync(filePath, buffer);

  return NextResponse.json({ filename });
}
