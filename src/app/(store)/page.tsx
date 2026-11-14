import { ArrowRight, BadgePercent, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { NewsletterForm } from "@/components/store/newsletter";
import { ProductArt } from "@/components/store/product-art";
import { ProductGrid } from "@/components/store/product-card";
import { getBestSellers, getFeaturedProducts, getNewArrivals, listCategories } from "@/server/catalog";

export default async function HomePage() {
  const [categories, featured, newArrivals, bestSellers] = await Promise.all([
    listCategories(),
    getFeaturedProducts(4),
    getNewArrivals(4),
    getBestSellers(4),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <Container className="grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:py-28">
          <Reveal>
            <p className="text-xs font-medium tracking-[0.3em] text-fg-muted uppercase">New season · 2026</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.02] font-semibold tracking-tight text-fg-strong sm:text-6xl lg:text-7xl">
              Made to be
              <br />
              worn every day.
            </h1>
            <p className="mt-6 max-w-md text-base text-fg-muted sm:text-lg">
              Essentials designed with care, built to last, and priced honestly — GST included.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/products" className={buttonClasses("primary", "lg")}>
                Shop the collection <ArrowRight className="size-4" />
              </Link>
              <Link href="/products?sort=popular" className={buttonClasses("secondary", "lg")}>
                Best sellers
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="relative hidden aspect-[4/5] max-h-[560px] overflow-hidden rounded-xl border border-border sm:block lg:justify-self-end lg:w-full">
            <ProductArt seed="vevvion-hero-2026" label="Vevvion collection" />
          </Reveal>
        </Container>
      </section>

      {/* Value props */}
      <section className="border-b border-border bg-surface">
        <Container className="grid gap-6 py-8 sm:grid-cols-3">
          <ValueProp icon={<Truck className="size-5" />} title="Delivery across India" text="Packed with care and dispatched quickly." />
          <ValueProp icon={<ShieldCheck className="size-5" />} title="Secure payments" text="UPI, cards and netbanking via Razorpay." />
          <ValueProp icon={<BadgePercent className="size-5" />} title="Honest pricing" text="All prices include GST. No surprises." />
        </Container>
      </section>

      {/* Categories */}
      <Container className="pt-20">
        <Reveal>
          <SectionHeading eyebrow="Browse" title="Shop by category" />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border transition-colors hover:border-border-strong"
              >
                <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                  <ProductArt seed={`cat-${c.slug}`} label={c.name} />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-bg via-bg/80 to-transparent p-4 pt-10">
                  <span className="font-display font-semibold text-fg-strong">{c.name}</span>
                  <ArrowRight className="size-4 text-fg transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      </Container>

      <ProductSection eyebrow="Curated" title="Featured" href="/products" products={featured} />

      {/* Promo banners */}
      <Container className="pt-20">
        <Reveal className="grid gap-5 md:grid-cols-2">
          <Promo
            eyebrow="Limited time"
            title="Up to 25% off audio"
            text="Noise-cancelling earbuds and more."
            href="/categories/tech"
            seed="promo-tech"
          />
          <Promo eyebrow="Just landed" title="The layering edit" text="Overshirts, merino and heavyweight tees." href="/categories/apparel" seed="promo-apparel" />
        </Reveal>
      </Container>

      <ProductSection eyebrow="Fresh" title="New arrivals" href="/products?sort=newest" products={newArrivals} />
      <ProductSection eyebrow="Loved by customers" title="Best sellers" href="/products?sort=popular" products={bestSellers} />

      {/* Newsletter */}
      <Container className="pt-24">
        <Reveal className="flex flex-col items-start justify-between gap-6 rounded-xl border border-border bg-surface p-8 sm:p-12 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-fg-strong sm:text-3xl">Be first to know</h2>
            <p className="mt-2 max-w-md text-fg-muted">New drops, restocks and members-only offers. No spam.</p>
          </div>
          <NewsletterForm />
        </Reveal>
      </Container>
    </>
  );
}

function ValueProp({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-bg text-accent">{icon}</span>
      <div>
        <p className="text-sm font-medium text-fg-strong">{title}</p>
        <p className="text-sm text-fg-muted">{text}</p>
      </div>
    </div>
  );
}

function ProductSection({ eyebrow, title, href, products }: { eyebrow: string; title: string; href: string; products: Awaited<ReturnType<typeof getFeaturedProducts>> }) {
  if (products.length === 0) return null;
  return (
    <Container className="pt-20">
      <Reveal>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          action={
            <Link href={href} className="flex shrink-0 items-center gap-1 text-sm text-fg hover:text-fg-strong">
              View all <ArrowRight className="size-4" />
            </Link>
          }
        />
        <ProductGrid products={products} />
      </Reveal>
    </Container>
  );
}

function Promo({ eyebrow, title, text, href, seed }: { eyebrow: string; title: string; text: string; href: string; seed: string }) {
  return (
    <Link href={href} className="group relative flex min-h-64 overflow-hidden rounded-xl border border-border transition-colors hover:border-border-strong">
      <div className="absolute inset-0 opacity-70 transition-transform duration-700 group-hover:scale-105">
        <ProductArt seed={seed} />
      </div>
      <div className="relative mt-auto w-full bg-gradient-to-t from-bg via-bg/85 to-transparent p-6 pt-16 sm:p-8 sm:pt-20">
        <p className="text-xs font-medium tracking-[0.25em] text-fg-muted uppercase">{eyebrow}</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-fg-strong">{title}</h3>
        <p className="mt-1 text-sm text-fg-muted">{text}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
          Shop now <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
