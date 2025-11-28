import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
    }

    const res = await fetch(url); // Server-side fetch avoids browser CORS
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream fetch failed: ${res.status}` }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // If it's already png/jpeg return as-is; otherwise still return with its type
    const dataUrl = `data:${contentType};base64,${base64}`;
    return NextResponse.json({ dataUrl }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}
