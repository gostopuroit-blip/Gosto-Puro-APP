// Comprime/redimensiona imagem no cliente antes do upload.
// Reduz peso (storage + banda + tempo de carregamento) sem depender de servidor.
// Vídeos e GIFs animados passam intactos.
export async function compressImage(file, { maxSize = 1440, quality = 0.82 } = {}) {
  try {
    if (!file || !file.type?.startsWith("image/")) return file;
    if (file.type === "image/gif") return file; // preserva animação

    // Respeita orientação EXIF quando suportado
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    if (!bitmap) return file;

    let { width, height } = bitmap;
    const scale = Math.min(1, maxSize / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", quality));
    // Se não conseguiu ou não ficou menor, mantém o original
    if (!blob || blob.size >= file.size) return file;

    const name = (file.name || "image").replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp", lastModified: file.lastModified || Date.now() });
  } catch {
    return file; // qualquer falha → sobe original, nunca bloqueia o post
  }
}
