import Link from "next/link";
import { formatPaise } from "@/lib/money";
import { fromPriceOf, hasVariablePricing, stockState, totalStock } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { ProductMedia } from "./product-media";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const price = fromPriceOf(product);
  const stock = stockState(totalStock(product));

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]">
          <ProductMedia
            image={product.images[0]}
            seed={product.slug}
            alt={product.name}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
          />
        </div>
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {price.onSale && stock !== "out_of_stock" && <Badge tone="solid">Sale</Badge>}
          {stock === "out_of_stock" && <Badge tone="neutral">Sold out</Badge>}
          {stock === "low_stock" && <Badge tone="warning">Few left</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <h3 className="line-clamp-1 text-sm font-medium text-fg-strong sm:text-base">{product.name}</h3>
        <p className="line-clamp-1 text-xs text-fg-muted">{product.shortDescription}</p>
        <Price
          className="mt-auto pt-1"
          size="sm"
          pricePaise={price.pricePaise}
          mrpPaise={price.mrpPaise}
          prefix={hasVariablePricing(product) ? "From" : undefined}
        />
        <p className="text-[11px] text-fg-muted">{product.deliveryPaise > 0 ? `+ ${formatPaise(product.deliveryPaise)} delivery` : "Free delivery"}</p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
