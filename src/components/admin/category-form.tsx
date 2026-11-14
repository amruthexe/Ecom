"use client";

import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { cn, slugify } from "@/lib/utils";
import type { CategoryInput } from "@/lib/validators/product";
import { deleteCategoryAction, saveCategoryAction, type FormState } from "@/server/actions/catalog";
import { ImageUploader, type UploadedImage } from "./image-uploader";
import { Alert, Field, inputCls, Panel } from "./ui";

export function CategoryForm({ initial }: { initial?: CategoryInput & { id?: string; productCount?: number } }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveCategoryAction, {});
  const [delState, deleteAction, deleting] = useActionState<FormState, FormData>(deleteCategoryAction, {});
  const errors = state.errors ?? {};

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.id);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [isActive, setActive] = useState(initial?.isActive ?? true);
  const [images, setImages] = useState<UploadedImage[]>(initial?.image ? [{ ...initial.image, alt: initial.image.alt ?? "" }] : []);
  const effectiveSlug = slugTouched ? slug : slugify(name);

  const payload = {
    name,
    slug: effectiveSlug,
    description,
    sortOrder: Number(sortOrder || 0),
    isActive,
    image: images[0] ?? null,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <form action={formAction} className="space-y-5" noValidate>
        {initial?.id && <input type="hidden" name="id" value={initial.id} />}
        <input type="hidden" name="payload" value={JSON.stringify(payload)} />
        {errors._form && <Alert tone="error">{errors._form}</Alert>}

        <Panel>
          <div className="space-y-4">
            <Field label="Category name" htmlFor="name" error={errors.name}>
              <input id="name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-invalid={!!errors.name} />
            </Field>
            <Field label="URL" htmlFor="slug" error={errors.slug} hint={`/categories/${effectiveSlug || "…"}`}>
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
            <Field label="Description" htmlFor="desc" error={errors.description} hint={`${description.length}/500`}>
              <textarea id="desc" rows={3} className={cn(inputCls, "h-auto py-2.5")} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </Field>
            <Field label="Image" error={errors.image}>
              <ImageUploader images={images} onChange={setImages} folder="categories" max={1} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Display order" htmlFor="order" hint="Lower shows first">
                <input id="order" inputMode="numeric" className={inputCls} value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/\D/g, "").slice(0, 4))} />
              </Field>
              <Field label="Visibility">
                <label className="flex h-11 cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-bg px-3 sm:h-10">
                  <span className="text-sm text-fg">{isActive ? "Visible" : "Hidden"}</span>
                  <input type="checkbox" checked={isActive} onChange={(e) => setActive(e.target.checked)} className="size-5 accent-[var(--accent)]" />
                </label>
              </Field>
            </div>
          </div>
        </Panel>

        <div className="flex items-center gap-3">
          <Link href="/admin/categories" className="rounded-md border border-border px-4 py-2.5 text-sm text-fg hover:border-border-strong">
            Cancel
          </Link>
          <button type="submit" disabled={pending} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50 sm:flex-none sm:px-8">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {initial?.id ? "Save changes" : "Create category"}
          </button>
        </div>
      </form>

      {initial?.id && (
        <Panel title="Delete category" description={initial.productCount ? `${initial.productCount} product(s) use this category — move them first.` : "This cannot be undone."}>
          {delState.errors?._form && <Alert tone="error">{delState.errors._form}</Alert>}
          <form action={deleteAction} onSubmit={(e) => !confirm(`Delete “${initial.name}”?`) && e.preventDefault()}>
            <input type="hidden" name="id" value={initial.id} />
            <button disabled={deleting || !!initial.productCount} className="flex items-center gap-2 rounded-md border border-danger/40 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 disabled:opacity-40">
              <Trash2 className="size-4" /> Delete category
            </button>
          </form>
        </Panel>
      )}
    </div>
  );
}
