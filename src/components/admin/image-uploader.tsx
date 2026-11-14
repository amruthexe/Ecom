"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Star, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type UploadedImage = { url: string; fileId?: string; alt: string; width?: number; height?: number };

type Pending = { tempId: string; name: string; preview: string; progress: number; error?: string };

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

type UploadAuth = { token: string; expire: number; signature: string; publicKey: string; folder: string };

function uploadToImageKit(file: File, auth: UploadAuth, onProgress: (pct: number) => void): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    body.append("fileName", file.name.replace(/[^\w.-]+/g, "-").slice(0, 80) || "image");
    body.append("publicKey", auth.publicKey);
    body.append("signature", auth.signature);
    body.append("expire", String(auth.expire));
    body.append("token", auth.token);
    body.append("folder", auth.folder);
    body.append("useUniqueFileName", "true");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://upload.imagekit.io/api/v1/files/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.url) {
          resolve({ url: res.url, fileId: res.fileId, alt: "", width: res.width, height: res.height });
        } else reject(new Error(res.message || "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.send(body);
  });
}

export function ImageUploader({
  images,
  onChange,
  folder,
  max = 10,
  error,
}: {
  images: UploadedImage[];
  onChange: (next: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])) => void;
  folder: "products" | "categories";
  max?: number;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [notice, setNotice] = useState<string>();
  const slotsLeft = max - images.length - pending.filter((p) => !p.error).length;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setNotice(undefined);
    const list = Array.from(files);
    if (list.length > slotsLeft) setNotice(`Only ${Math.max(slotsLeft, 0)} more image${slotsLeft === 1 ? "" : "s"} allowed.`);

    for (const file of list.slice(0, Math.max(slotsLeft, 0))) {
      // Not crypto.randomUUID(): it is unavailable on plain-http LAN addresses (phone testing).
      const tempId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const preview = URL.createObjectURL(file);
      const fail = (msg: string) => setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, error: msg } : x)));
      setPending((p) => [...p, { tempId, name: file.name, preview, progress: 0 }]);

      if (!ALLOWED.includes(file.type)) {
        fail("Use JPG, PNG, WebP or AVIF");
        continue;
      }
      if (file.size > MAX_BYTES) {
        fail("Max 5 MB per image");
        continue;
      }
      try {
        const res = await fetch(`/api/admin/upload-auth?folder=${folder}`, { cache: "no-store" });
        const auth = await res.json();
        if (!res.ok) throw new Error(auth.error || "Not allowed to upload");
        const uploaded = await uploadToImageKit(file, auth, (pct) =>
          setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, progress: pct } : x))),
        );
        onChange((prev) => [...prev, uploaded]);
        setPending((p) => p.filter((x) => x.tempId !== tempId));
        URL.revokeObjectURL(preview);
      } catch (e) {
        fail(e instanceof Error ? e.message : "Upload failed");
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <figure key={img.fileId ?? img.url} className={cn("overflow-hidden rounded-md border bg-bg", i === 0 && max > 1 ? "border-accent" : "border-border")}>
            <div className="relative aspect-square">
              <Image src={img.url} alt={img.alt || `Image ${i + 1}`} fill sizes="200px" className="object-cover" />
              {i === 0 && max > 1 && (
                <span className="absolute top-2 left-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-contrast">COVER</span>
              )}
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute top-1.5 right-1.5 rounded-full bg-bg/80 p-1.5 text-fg-strong backdrop-blur hover:text-danger"
                aria-label={`Remove image ${i + 1}`}
              >
                <X className="size-4" />
              </button>
            </div>
            {max > 1 && (
              <div className="flex items-center justify-between border-t border-border">
                <IconBtn label="Move left" onClick={() => move(i, i - 1)} disabled={i === 0}>
                  <ArrowLeft className="size-4" />
                </IconBtn>
                <IconBtn label="Make cover image" onClick={() => move(i, 0)} disabled={i === 0}>
                  <Star className="size-4" />
                </IconBtn>
                <IconBtn label="Move right" onClick={() => move(i, i + 1)} disabled={i === images.length - 1}>
                  <ArrowRight className="size-4" />
                </IconBtn>
              </div>
            )}
            <input
              value={img.alt}
              onChange={(e) => onChange(images.map((x, j) => (j === i ? { ...x, alt: e.target.value.slice(0, 200) } : x)))}
              placeholder="Alt text (optional)"
              aria-label={`Alt text for image ${i + 1}`}
              className="w-full border-t border-border bg-transparent px-2 py-2 text-xs text-fg placeholder:text-fg-muted/60 focus:outline-none"
            />
          </figure>
        ))}

        {pending.map((p) => (
          <figure key={p.tempId} className="relative overflow-hidden rounded-md border border-border bg-bg">
            <div className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={p.preview} alt="" className="h-full w-full object-cover opacity-40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
                {p.error ? (
                  <>
                    <p className="text-xs text-danger">{p.error}</p>
                    <button type="button" className="text-xs text-fg underline" onClick={() => setPending((x) => x.filter((y) => y.tempId !== p.tempId))}>
                      Dismiss
                    </button>
                  </>
                ) : (
                  <>
                    <div className="h-1.5 w-3/4 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full bg-accent transition-[width]" style={{ width: `${p.progress}%` }} />
                    </div>
                    <p className="text-xs text-fg-strong tabular-nums">{p.progress}%</p>
                  </>
                )}
              </div>
            </div>
          </figure>
        ))}

        {slotsLeft > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-2 rounded-md border border-dashed text-fg-muted transition-colors hover:border-accent hover:text-fg-strong",
              error ? "border-danger" : "border-border-strong",
            )}
          >
            <ImagePlus className="size-6" />
            <span className="text-xs">{max > 1 ? "Add images" : "Add image"}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        multiple={max > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="mt-2 text-xs text-fg-muted">
        JPG, PNG, WebP or AVIF · max 5 MB each{max > 1 ? ` · up to ${max} images · first image is the cover` : ""}
      </p>
      {(error || notice) && <p className="mt-1 text-xs text-danger">{error || notice}</p>}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="flex-1 py-2 text-fg-muted hover:bg-surface-2 hover:text-fg-strong disabled:opacity-30">
      <span className="flex justify-center">{children}</span>
    </button>
  );
}
