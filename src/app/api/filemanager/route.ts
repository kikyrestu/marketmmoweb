import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

export async function GET() {
  try {
    const files = fs.readdirSync(uploadsDir).filter(f => !fs.statSync(path.join(uploadsDir, f)).isDirectory());
    return NextResponse.json({ files });
  } catch (e) {
    console.error('[FILEMANAGER_GET]', e)
    return NextResponse.json({ files: [], error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  if (!file) return NextResponse.json({ error: 'No file specified' }, { status: 400 });
  try {
    fs.unlinkSync(path.join(uploadsDir, file));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[FILEMANAGER_DELETE]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
