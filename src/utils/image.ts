export async function convertImageToPngDataUrl(url: string): Promise<string> {
  // If it's already a data URL, try to return as-is; if it's not PNG/JPEG, we still try to convert
  if (url.startsWith('data:')) {
    try {
      const [header] = url.split(',');
      if (/data:image\/(png|jpeg|jpg)/i.test(header)) return url;
      // Not PNG/JPEG, attempt to draw to canvas and export as PNG
      return await drawToCanvasAndExport(url);
    } catch {
      return url;
    }
  }

  // Try direct fetch first
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const blob = await res.blob();

    // If it's already a PNG or JPEG, we can return base64 directly without canvas
    const base64 = await blobToDataUrl(blob);
    if (/^data:image\/(png|jpeg|jpg);/i.test(base64)) {
      return base64;
    }

    // Otherwise, convert to PNG using canvas
    try {
      return await blobToPngDataUrlViaCanvas(blob);
    } catch {
      // Fallback: return original base64 even if not PNG
      return base64;
    }
  } catch (fetchError) {
    // If direct fetch fails (CORS), try via proxy
    try {
      const proxyRes = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json?.dataUrl) return json.dataUrl;
      }
    } catch {}
    
    // Last resort: return original URL (will fail in PDF but at least we tried)
    throw new Error(`Cannot convert image: ${url}`);
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function blobToPngDataUrlViaCanvas(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 900;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for canvas'));
    img.src = URL.createObjectURL(blob);
  });
}

async function drawToCanvasAndExport(dataUrl: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 900;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL('image/png');
        resolve(out);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Failed to load data URL for canvas'));
    img.src = dataUrl;
  });
}
