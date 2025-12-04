import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Buckets públicos (usan getPublicUrl)
const PUBLIC_BUCKETS: string[] = ['avatars', 'covers', 'certificates', 'files'];

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

    // Determinar tipo de URL según el bucket
    let fileUrl: string;
    
    if (PUBLIC_BUCKETS.includes(bucket)) {
      // Buckets públicos: usar URL pública
      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      console.log(`[uploadFile API] Subido exitosamente (público): ${fileUrl}`);
    } else {
      // Buckets privados: usar URL firmada (1 año)
      const { data: signedUrlData, error: signedError } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      
      if (signedError) {
        console.error('[uploadFile API] Error al crear URL firmada:', signedError);
        throw signedError;
      }
      
      fileUrl = signedUrlData.signedUrl;
      console.log(`[uploadFile API] Subido exitosamente (privado): ${fileUrl}`);
    }

    return NextResponse.json({ 
      url: fileUrl,
      path: data.path 
    }, { status: 200 });

  } catch (e: any) {
    console.error('[uploadFile API] Error:', e);
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 });
  }
}
