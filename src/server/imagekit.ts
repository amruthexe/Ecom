import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { env } from "./env";

/**
 * ImageKit integration. The private key never leaves the server:
 * the browser gets a short-lived signature and uploads directly to ImageKit.
 */

export const IMAGE_FOLDERS = { products: "/vevvion/products", categories: "/vevvion/categories" } as const;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type UploadAuth = {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  folder: string;
};

export function getUploadAuth(folder: keyof typeof IMAGE_FOLDERS): UploadAuth {
  const { IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY } = env.imagekit();
  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes
  const signature = createHmac("sha1", IMAGEKIT_PRIVATE_KEY).update(token + expire).digest("hex");
  return { token, expire, signature, publicKey: IMAGEKIT_PUBLIC_KEY, folder: IMAGE_FOLDERS[folder] };
}

/** Only accept image URLs served from our own ImageKit endpoint. */
export function isOwnImageUrl(url: string): boolean {
  const { IMAGEKIT_URL_ENDPOINT } = env.imagekit();
  return url.startsWith(IMAGEKIT_URL_ENDPOINT.replace(/\/$/, "") + "/");
}

/** Best-effort delete of files no longer referenced. Failures are logged, never thrown. */
export async function deleteImageKitFiles(fileIds: string[]): Promise<void> {
  const ids = [...new Set(fileIds.filter(Boolean))];
  if (ids.length === 0) return;
  const { IMAGEKIT_PRIVATE_KEY } = env.imagekit();
  try {
    const res = await fetch("https://api.imagekit.io/v1/files/batchDeleteFiles", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(IMAGEKIT_PRIVATE_KEY + ":").toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileIds: ids }),
    });
    if (!res.ok) console.error("[imagekit] batch delete failed", res.status, await res.text().catch(() => ""));
  } catch (error) {
    console.error("[imagekit] batch delete error", error);
  }
}
