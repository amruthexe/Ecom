/**
 * next/image loader: ImageKit resizes, compresses and converts (AVIF/WebP) at the CDN edge,
 * so images are optimized without using Vercel image optimization.
 */
export default function imagekitLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (src.startsWith("https://ik.imagekit.io/")) {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}tr=w-${width},q-${quality ?? 80},f-auto`;
  }
  return src;
}
