"use client";

import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { optionCombinations } from "@/lib/catalog";
import { cleanMoneyInput, discountPercent, formatPaise, formatPercent } from "@/lib/money";
import { cn, slugify } from "@/lib/utils";
import type { ProductInput } from "@/lib/validators/product";
import { saveProductAction, type FormState } from "@/server/actions/catalog";
import { ImageUploader, type UploadedImage } from "./image-uploader";
import { Alert, Field, inputCls, Panel } from "./ui";

type Initial = ProductInput & { id?: string };

type VariantRow = { id?: string; sku: string; options: Record<string, string>; stock: string; mrp: string };
type OptionRow = { name: string; values: string };

const num = (s: string): number | undefined => (s.trim() === "" ? undefined : Number(s));
const comboKey = (o: Record<string, string>, names: string[]) => names.map((n) => o[n] ?? "").join("|");
const skuPart = (v: string) => v.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();

export function ProductForm({ initial, categories }: { initial?: Initial; categories: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveProductAction, {});
  const errors = state.errors ?? {};

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.id);
  const [shortDescription, setShort] = useState(initial?.shortDescription ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [status, setStatus] = useState<Initial["status"]>(initial?.status ?? "active");
  const [isFeatured, setFeatured] = useState(initial?.isFeatured ?? false);
  const [mrp, setMrp] = useState(initial?.mrpRupees !== undefined ? String(initial.mrpRupees) : "");
  const [salePrice, setSalePrice] = useState(initial?.salePriceRupees !== undefined ? String(initial.salePriceRupees) : "");
  // New products start with the standard ₹300 delivery charge (owner decision 2026-11-21).
  const [delivery, setDelivery] = useState(initial?.deliveryRupees !== undefined ? String(initial.deliveryRupees) : "300");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [stock, setStock] = useState(String(initial?.stock ?? 0));
  const [images, setImages] = useState<UploadedImage[]>(initial?.images?.map((i) => ({ ...i, alt: i.alt ?? "" })) ?? []);
  const [options, setOptions] = useState<OptionRow[]>((initial?.options ?? []).map((o) => ({ name: o.name, values: o.values.join(", ") })));
  const [variants, setVariants] = useState<VariantRow[]>(
    (initial?.variants ?? []).map((v) => ({
      id: v.id,
      sku: v.sku,
      options: v.options,
      stock: String(v.stock),
      mrp: v.mrpRupees !== undefined ? String(v.mrpRupees) : "",
    })),
  );

  const parsedOptions = useMemo(
    () => options.map((o) => ({ name: o.name.trim(), values: [...new Set(o.values.split(",").map((v) => v.trim()).filter(Boolean))] })),
    [options],
  );
  const hasVariants = options.length > 0;
  const effectiveSlug = slugTouched ? slug : slugify(name);

  const mrpPaise = Math.round((num(mrp) ?? 0) * 100);
  const salePaise = Math.round((num(salePrice) ?? 0) * 100);
  const deliveryPaise = Math.round((num(delivery) ?? 0) * 100);
  const saleValid = mrpPaise > 0 && salePaise > 0 && salePaise <= mrpPaise;
  const offPercent = saleValid ? discountPercent(mrpPaise, salePaise) : 0;

  const optionNames = parsedOptions.map((o) => o.name);
  const combos = optionCombinations(parsedOptions);
  const variantsStale =
    hasVariants && (combos.length !== variants.length || combos.some((c) => !variants.some((v) => comboKey(v.options, optionNames) === comboKey(c, optionNames))));

  function generateVariants() {
    const existing = new Map(variants.map((v) => [comboKey(v.options, optionNames), v]));
    const base = sku.trim().toUpperCase() || "SKU";
    setVariants(
      combos.map((c) => existing.get(comboKey(c, optionNames)) ?? { sku: `${base}-${optionNames.map((n) => skuPart(c[n])).join("-")}`, options: c, stock: "0", mrp: "" }),
    );
  }

  const payload: Record<string, unknown> = {
    name,
    slug: effectiveSlug,
    shortDescription,
    description,
    categoryId,
    tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    status,
    isFeatured,
    mrpRupees: num(mrp),
    salePriceRupees: num(salePrice),
    deliveryRupees: num(delivery),
    sku,
    stock: hasVariants ? 0 : (num(stock) ?? 0),
    options: hasVariants ? parsedOptions : [],
    variants: hasVariants ? variants.map((v) => ({ id: v.id, sku: v.sku, options: v.options, stock: num(v.stock) ?? 0, mrpRupees: num(v.mrp) })) : [],
    images,
  };

  const totalVariantStock = variants.reduce((s, v) => s + (num(v.stock) ?? 0), 0);

  return (
    <form action={formAction} className="mx-auto max-w-5xl" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      {errors._form && <Alert tone="error">{errors._form}</Alert>}
      {Object.keys(errors).length > 0 && !errors._form && <Alert tone="error">Please fix the highlighted fields.</Alert>}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Panel title="Details">
            <div className="space-y-4">
              <Field label="Product name" htmlFor="name" error={errors.name}>
                <input id="name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} aria-invalid={!!errors.name} required />
              </Field>
              <Field label="Short description" htmlFor="short" error={errors.shortDescription} hint={`${shortDescription.length}/200 · shown on product cards`}>
                <input id="short" className={inputCls} value={shortDescription} onChange={(e) => setShort(e.target.value)} maxLength={200} />
              </Field>
              <Field label="Full description" htmlFor="desc" error={errors.description}>
                <textarea
                  id="desc"
                  rows={6}
                  className={cn(inputCls, "h-auto py-2.5")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Images" description="Upload from your phone or computer. Use the arrows to reorder; the star makes an image the cover.">
            <ImageUploader images={images} onChange={setImages} folder="products" max={10} error={errors.images} />
          </Panel>

          <Panel title="Pricing" description="Prices include GST. Enter the MRP and your selling price — the discount % is worked out for you.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="MRP / original price (₹)" htmlFor="mrp" error={errors.mrpRupees}>
                <input
                  id="mrp"
                  inputMode="decimal"
                  className={inputCls}
                  value={mrp}
                  onChange={(e) => setMrp(cleanMoneyInput(e.target.value))}
                  placeholder="e.g. 1000"
                  aria-invalid={!!errors.mrpRupees}
                />
              </Field>
              <Field label="Selling price (₹)" htmlFor="salePrice" error={errors.salePriceRupees} hint="Same as MRP = no discount">
                <input
                  id="salePrice"
                  inputMode="decimal"
                  className={inputCls}
                  value={salePrice}
                  onChange={(e) => setSalePrice(cleanMoneyInput(e.target.value))}
                  placeholder="e.g. 895.50"
                  aria-invalid={!!errors.salePriceRupees}
                />
              </Field>
              <Field label="Delivery charge (₹)" htmlFor="delivery" error={errors.deliveryRupees} hint="Per piece · 0 = free">
                <input
                  id="delivery"
                  inputMode="decimal"
                  className={inputCls}
                  value={delivery}
                  onChange={(e) => setDelivery(cleanMoneyInput(e.target.value))}
                  placeholder="e.g. 300"
                  aria-invalid={!!errors.deliveryRupees}
                />
              </Field>
            </div>
            {mrpPaise > 0 && salePaise > mrpPaise && <p className="mt-2 text-xs text-danger">Selling price can&apos;t be more than MRP.</p>}
            <div className="mt-4 space-y-2 rounded-md border border-border bg-bg px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm text-fg-muted">Discount</span>
                <span className="text-xl font-semibold text-accent tabular-nums">{saleValid ? (offPercent > 0 ? formatPercent(offPercent) + " off" : "No discount") : "—"}</span>
                {saleValid && offPercent > 0 && <span className="text-sm text-fg-muted">saves {formatPaise(mrpPaise - salePaise)}</span>}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-border pt-2 text-sm">
                <span className="text-fg-muted">Customer pays per piece</span>
                <span className="font-semibold text-fg-strong tabular-nums">{saleValid ? formatPaise(salePaise) : "—"}</span>
                <span className="text-fg-muted">+ {formatPaise(deliveryPaise)} delivery =</span>
                <span className="text-lg font-semibold text-fg-strong tabular-nums">{saleValid ? formatPaise(salePaise + deliveryPaise) : "—"}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Inventory">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU" htmlFor="sku" error={errors.sku} hint="Unique code, e.g. VV-TEE-001">
                <input
                  id="sku"
                  className={cn(inputCls, "uppercase")}
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  maxLength={40}
                  aria-invalid={!!errors.sku}
                />
              </Field>
              {!hasVariants && (
                <Field label="Stock quantity" htmlFor="stock" error={errors.stock}>
                  <input id="stock" inputMode="numeric" className={inputCls} value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} />
                </Field>
              )}
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-fg-strong">Variants</h3>
                  <p className="text-xs text-fg-muted">Sizes, colours… each combination gets its own SKU and stock.</p>
                </div>
                {options.length < 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions((o) => [...o, { name: o.length === 0 ? "Size" : "Colour", values: "" }])}
                    className="flex shrink-0 items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-fg hover:border-accent"
                  >
                    <Plus className="size-4" /> Option
                  </button>
                )}
              </div>
              {errors.options && <p className="mb-2 text-xs text-danger">{errors.options}</p>}

              {options.map((o, i) => (
                <div key={i} className="mb-3 grid gap-2 rounded-md border border-border bg-bg p-3 sm:grid-cols-[140px_1fr_auto] sm:items-start">
                  <input
                    className={inputCls}
                    value={o.name}
                    onChange={(e) => setOptions((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    placeholder="Option (e.g. Size)"
                    aria-label={`Option ${i + 1} name`}
                  />
                  <div>
                    <input
                      className={inputCls}
                      value={o.values}
                      onChange={(e) => setOptions((all) => all.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))}
                      placeholder="Values, comma separated (S, M, L, XL)"
                      aria-label={`Option ${i + 1} values`}
                    />
                    {errors[`options.${i}.values`] && <p className="mt-1 text-xs text-danger">{errors[`options.${i}.values`]}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOptions((all) => all.filter((_, j) => j !== i));
                      setVariants([]);
                    }}
                    className="flex h-11 items-center justify-center gap-1 rounded-md px-3 text-sm text-fg-muted hover:bg-danger/10 hover:text-danger sm:h-10"
                    aria-label={`Remove option ${i + 1}`}
                  >
                    <Trash2 className="size-4" /> <span className="sm:hidden">Remove option</span>
                  </button>
                </div>
              ))}

              {hasVariants && (
                <>
                  <button
                    type="button"
                    onClick={generateVariants}
                    disabled={combos.length === 0}
                    className={cn(
                      "mb-3 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm disabled:opacity-40 sm:w-auto",
                      variantsStale ? "border-accent bg-accent/10 text-fg-strong" : "border-border text-fg",
                    )}
                  >
                    <RefreshCw className="size-4" />
                    {variants.length ? "Update variants" : "Generate variants"} ({combos.length})
                  </button>
                  {variantsStale && variants.length > 0 && <p className="mb-3 text-xs text-warning">Options changed — tap “Update variants”. Existing stock is kept.</p>}
                  {errors.variants && <p className="mb-2 text-xs text-danger">{errors.variants}</p>}

                  {variants.length > 0 && (
                    <div className="space-y-2">
                      <div className="hidden grid-cols-[1fr_1.2fr_90px_110px] gap-2 px-1 text-xs text-fg-muted sm:grid">
                        <span>Variant</span>
                        <span>SKU</span>
                        <span>Stock</span>
                        <span>MRP override</span>
                      </div>
                      {variants.map((v, i) => (
                        <div key={comboKey(v.options, optionNames) || i} className="grid grid-cols-2 gap-2 rounded-md border border-border bg-bg p-3 sm:grid-cols-[1fr_1.2fr_90px_110px] sm:items-center sm:p-2">
                          <p className="col-span-2 text-sm font-medium text-fg-strong sm:col-span-1">{optionNames.map((n) => v.options[n]).join(" / ")}</p>
                          <div className="col-span-2 sm:col-span-1">
                            <input
                              className={cn(inputCls, "uppercase")}
                              value={v.sku}
                              onChange={(e) => setVariants((all) => all.map((x, j) => (j === i ? { ...x, sku: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") } : x)))}
                              aria-label="Variant SKU"
                              aria-invalid={!!errors[`variants.${i}.sku`]}
                            />
                            {errors[`variants.${i}.sku`] && <p className="mt-1 text-xs text-danger">{errors[`variants.${i}.sku`]}</p>}
                          </div>
                          <label className="text-xs text-fg-muted sm:contents">
                            <span className="sm:hidden">Stock</span>
                            <input
                              inputMode="numeric"
                              className={inputCls}
                              value={v.stock}
                              onChange={(e) => setVariants((all) => all.map((x, j) => (j === i ? { ...x, stock: e.target.value.replace(/\D/g, "") } : x)))}
                              aria-label="Variant stock"
                            />
                          </label>
                          <label className="text-xs text-fg-muted sm:contents">
                            <span className="sm:hidden">MRP override (₹) · same discount %</span>
                            <input
                              inputMode="decimal"
                              className={inputCls}
                              value={v.mrp}
                              placeholder="Same"
                              onChange={(e) => setVariants((all) => all.map((x, j) => (j === i ? { ...x, mrp: cleanMoneyInput(e.target.value) } : x)))}
                              aria-label="Variant MRP override"
                            />
                          </label>
                          {errors[`variants.${i}`] && <p className="col-span-2 text-xs text-danger sm:col-span-4">{errors[`variants.${i}`]}</p>}
                        </div>
                      ))}
                      <p className="px-1 text-xs text-fg-muted">Total stock: {totalVariantStock}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Status">
            <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-bg p-1" role="radiogroup" aria-label="Status">
              {(["active", "draft", "archived"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={status === s}
                  onClick={() => setStatus(s)}
                  className={cn("rounded px-2 py-2 text-sm capitalize", status === s ? "bg-accent text-accent-contrast" : "text-fg-muted hover:text-fg-strong")}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-fg-muted">
              {status === "active" ? "Visible in the store." : status === "draft" ? "Hidden — finish it later." : "Hidden and kept for records."}
            </p>
            <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-bg px-3 py-3">
              <span className="text-sm text-fg">Feature on homepage</span>
              <input type="checkbox" checked={isFeatured} onChange={(e) => setFeatured(e.target.checked)} className="size-5 accent-[var(--accent)]" />
            </label>
          </Panel>

          <Panel title="Organisation">
            <div className="space-y-4">
              <Field label="Category" htmlFor="category" error={errors.categoryId}>
                {categories.length ? (
                  <select id="category" className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-invalid={!!errors.categoryId}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-warning">
                    No categories yet.{" "}
                    <Link href="/admin/categories/new" className="underline">
                      Create one first
                    </Link>
                    .
                  </p>
                )}
              </Field>
              <Field label="Tags" htmlFor="tags" hint="Comma separated — helps search" error={errors.tags}>
                <input id="tags" className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="cotton, summer" />
              </Field>
              <Field label="URL" htmlFor="slug" error={errors.slug} hint={`/products/${effectiveSlug || "…"}`}>
                <input
                  id="slug"
                  className={inputCls}
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                  }}
                  aria-invalid={!!errors.slug}
                />
              </Field>
            </div>
          </Panel>
        </div>
      </div>

      {/* Sticky save bar — sits above the mobile tab bar */}
      <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:sticky lg:bottom-0 lg:mt-6 lg:rounded-lg lg:border">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link href="/admin/products" className="rounded-md border border-border px-4 py-2.5 text-sm text-fg hover:border-border-strong">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending || categories.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50 sm:flex-none sm:px-8"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {initial?.id ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </form>
  );
}
