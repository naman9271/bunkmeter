const MAX_SIDE = 2400;
const MAX_BYTES = 4 * 1024 * 1024;
const PASSTHROUGH = ["image/png", "image/jpeg", "image/webp"];

/** Shrinks big phone photos/screenshots so they fit the API's 5MB limit. */
export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_BYTES && PASSTHROUGH.includes(file.type)) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.92));
}
