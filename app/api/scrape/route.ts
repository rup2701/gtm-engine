import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { url, targetName } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    const response = await fetch(url);
    const html = await response.text();
    const cleanText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(path.join(dataDir, `${targetName || 'custom'}_master.md`), cleanText);
    return NextResponse.json({ success: true, message: `Updated ${targetName}_master.md` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}