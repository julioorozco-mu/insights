import { supabaseClient, storage } from "@/lib/supabase";

export async function getFileUrl(path: string): Promise<string> {
  try {
    // Supabase Storage genera URLs públicas
    const { data } = storage.from('files').getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error("Error getting file URL:", error);
    throw new Error("No se pudo obtener la URL del archivo");
  }
}

// Función alternativa para obtener URL firmada (con expiración)
export async function getSignedFileUrl(path: string, expiresIn: number = 3600): Promise<string> {
  try {
    const { data, error } = await storage.from('files').createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error("Error getting signed file URL:", error);
    throw new Error("No se pudo obtener la URL firmada del archivo");
  }
}

// Agora no requiere URLs de thumbnail o playback como Mux
// El streaming se maneja directamente a través del SDK de Agora en el cliente
