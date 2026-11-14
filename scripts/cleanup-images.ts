/**
 * Deletes ImageKit images that no product or category references
 * (e.g. uploaded in the admin form, then the form was abandoned).
 *
 *   pnpm cleanup-images                 → dry run: lists what would be deleted
 *   pnpm cleanup-images --apply         → actually deletes
 *   --min-age-minutes=60                → only files older than this (default 60, protects in-progress edits)
 */
import mongoose from "mongoose";
import { Category } from "@/server/models/category";
import { Product } from "@/server/models/product";

const FOLDERS = ["/vevvion/products", "/vevvion/categories", "/vevvion/_checks"];

type IkFile = { fileId: string; filePath: string; createdAt: string; size: number; type: string };

async function main() {
  const { MONGODB_URI, MONGODB_DB_NAME, IMAGEKIT_PRIVATE_KEY } = process.env;
  if (!MONGODB_URI || !IMAGEKIT_PRIVATE_KEY) throw new Error("MONGODB_URI and IMAGEKIT_PRIVATE_KEY are required");
  const apply = process.argv.includes("--apply");
  const minAge = Number(process.argv.find((a) => a.startsWith("--min-age-minutes="))?.split("=")[1] ?? 60);
  const auth = "Basic " + Buffer.from(IMAGEKIT_PRIVATE_KEY + ":").toString("base64");

  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME || undefined });
  const [products, categories] = await Promise.all([
    Product.find({}, { "images.fileId": 1 }).lean<{ images: { fileId?: string }[] }[]>(),
    Category.find({}, { "image.fileId": 1 }).lean<{ image?: { fileId?: string } }[]>(),
  ]);
  const used = new Set<string>([
    ...products.flatMap((p) => p.images.map((i) => i.fileId).filter((f): f is string => !!f)),
    ...categories.map((c) => c.image?.fileId).filter((f): f is string => !!f),
  ]);

  const files: IkFile[] = [];
  for (const path of FOLDERS) {
    for (let skip = 0; ; skip += 1000) {
      const res = await fetch(`https://api.imagekit.io/v1/files?path=${encodeURIComponent(path)}&limit=1000&skip=${skip}`, { headers: { Authorization: auth } });
      if (!res.ok) throw new Error(`ImageKit list failed: ${res.status} ${await res.text()}`);
      const page = (await res.json()) as IkFile[];
      files.push(...page.filter((f) => f.type === "file"));
      if (page.length < 1000) break;
    }
  }

  const cutoff = Date.now() - minAge * 60_000;
  const orphans = files.filter((f) => !used.has(f.fileId) && new Date(f.createdAt).getTime() < cutoff);
  console.log(`ImageKit files: ${files.length} · referenced: ${used.size} · unused older than ${minAge} min: ${orphans.length}`);
  orphans.forEach((f) => console.log(`  ${apply ? "delete" : "would delete"}  ${f.filePath}  (${Math.round(f.size / 1024)} KB, ${f.createdAt})`));

  if (apply && orphans.length) {
    for (let i = 0; i < orphans.length; i += 100) {
      const ids = orphans.slice(i, i + 100).map((f) => f.fileId);
      const res = await fetch("https://api.imagekit.io/v1/files/batch/deleteByFileIds", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: ids }),
      });
      console.log(`  batch ${i / 100 + 1}: ${res.status}`);
    }
  } else if (orphans.length) {
    console.log("Dry run. Re-run with --apply to delete.");
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
