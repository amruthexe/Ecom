import type { Metadata } from "next";
import { ChevronRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, SectionHeading } from "@/components/ui/layout";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductGrid } from "@/components/store/product-card";
import { ProductPurchase } from "@/components/store/product-purchase";
import { getCategory, getProduct, getRelatedProducts, listProductSlugs } from "@/server/catalog";

export async function generateStaticParams() {
  const slugs = await listProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Product not found" };
  return { title: product.name, description: product.shortDescription };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const [category, related] = await Promise.all([getCategory(product.categorySlug), getRelatedProducts(product, 4)]);

  return (
    <Container className="py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-fg-muted">
        <Link href="/" className="hover:text-fg-strong">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href="/products" className="hover:text-fg-strong">
          Shop
        </Link>
        {category && (
          <>
            <ChevronRight className="size-3.5" />
            <Link href={`/categories/${category.slug}`} className="hover:text-fg-strong">
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5" />
        <span className="text-fg" aria-current="page">
          {product.name}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.images} seed={product.slug} name={product.name} />

        <div className="lg:pt-2">
          {category && <p className="text-xs font-medium tracking-[0.25em] text-fg-muted uppercase">{category.name}</p>}
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">{product.name}</h1>
          {product.ratingCount > 0 && (
            <p className="mt-3 text-sm text-fg-muted">
              <span className="text-fg-strong">★ {product.ratingAvg.toFixed(1)}</span> · {product.ratingCount} reviews
            </p>
          )}
          <p className="mt-4 text-fg">{product.shortDescription}</p>

          <div className="mt-8">
            <ProductPurchase product={product} />
          </div>

          <ul className="mt-8 grid gap-3 border-t border-border pt-6 text-sm sm:grid-cols-3">
            <Assurance icon={<Truck className="size-4" />} text="Delivery across India" />
            <Assurance icon={<ShieldCheck className="size-4" />} text="Secure Razorpay checkout" />
            <Assurance icon={<RotateCcw className="size-4" />} text="Cancel before dispatch" />
          </ul>

          <section className="mt-8 border-t border-border pt-6">
            <h2 className="mb-3 text-xs font-medium tracking-[0.2em] text-fg-strong uppercase">Description</h2>
            <p className="leading-relaxed text-fg-muted">{product.description}</p>
            <p className="mt-4 text-xs text-fg-muted">
              SKU: <span className="text-fg">{product.sku}</span>
            </p>
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <SectionHeading eyebrow="You may also like" title="Related products" />
          <ProductGrid products={related} />
        </section>
      )}
    </Container>
  );
}

function Assurance({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2 text-fg-muted">
      <span className="text-accent">{icon}</span>
      {text}
    </li>
  );
}
