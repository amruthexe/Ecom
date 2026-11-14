import Image from "next/image";
import type { ProductImage } from "@/lib/types";
import { ProductArt } from "./product-art";

/** Renders an uploaded product image, falling back to generated artwork. */
export function ProductMedia({
  image,
  seed,
  alt,
  sizes,
  priority,
}: {
  image?: ProductImage;
  seed: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  if (!image) return <ProductArt seed={seed} label={alt} />;
  return <Image src={image.url} alt={image.alt || alt} fill sizes={sizes} priority={priority} className="object-cover" />;
}
