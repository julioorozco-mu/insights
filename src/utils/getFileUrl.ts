import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";

export async function getFileUrl(path: string): Promise<string> {
  try {
    const fileRef = ref(storage, path);
    const url = await getDownloadURL(fileRef);
    return url;
  } catch (error) {
    console.error("Error getting file URL:", error);
    throw new Error("No se pudo obtener la URL del archivo");
  }
}

// Agora no requiere URLs de thumbnail o playback como Mux
// El streaming se maneja directamente a través del SDK de Agora en el cliente
