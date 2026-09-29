// Phone photos are often 3-12MB straight off the camera -- far bigger than
// a thumbnail or item photo ever needs, and slow to upload on mobile data.
// Shrink to at most MAX_EDGE px on the long side and re-encode as JPEG
// before uploading. JPEG rather than WebP because Safari's canvas can't
// encode WebP on older iPhones.
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process this image");

  // JPEG has no transparency -- without a fill, a transparent PNG's
  // background would come out black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process this image"))),
      "image/jpeg",
      QUALITY,
    ),
  );
}
