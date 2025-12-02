import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'covers';
    const path = formData.get('path') as string;

    if (!file || !path) {
      return NextResponse.json({ error: 'Archivo y path son requeridos' }, { status: 400 });
    }

    console.log(`[uploadFile API] Subiendo ${file.name} a ${bucket}/${path}`);

    const supabaseAdmin = getSupabaseAdmin();

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir usando el admin client (bypass RLS)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('[uploadFile API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);

    console.log(`[uploadFile API] Subido exitosamente: ${urlData.publicUrl}`);

    return NextResponse.json({ 
      url: urlData.publicUrl,
      path: data.path 
    }, { status: 200 });

  } catch (e: any) {
    console.error('[uploadFile API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
