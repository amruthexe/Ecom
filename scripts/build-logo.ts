/**
 * Builds web logo assets from the owner's original logo (logo/logo.jpg.jpeg, white background).
 *   pnpm build-logo
 *
 * Outputs (public/brand + src/app icon conventions):
 *   logo-full-dark.png        leaf + VEVVION + tagline, transparent, text lightened for the black site
 *   logo-horizontal-dark.png  leaf + VEVVION (no tagline) for headers, transparent, text lightened
 *   logo-full-light.png       original colours, transparent (for white backgrounds, e.g. Razorpay window)
 *   logo-mark.png             leaf only, transparent, square
 *   src/app/icon.png          512² app/browser icon (leaf on black)
 *   src/app/apple-icon.png    180² iOS home-screen icon (leaf on black)
 *   src/app/opengraph-image.png 1200×630 link-preview image (WhatsApp, etc.)
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const SRC = "logo/logo.jpg.jpeg";
const OUT = "public/brand";

// Layout of the original 1600×793 artwork (measured): leaf on the left, text starts at x≈548.
const TEXT_X = 548;
const LEAF_TIP_MAX_X = 600; // the leaf tip pokes past TEXT_X only above y≈335
const TEXT_TOP_Y = 336;
const TAGLINE_TOP_Y = 560;

const BG = { r: 10, g: 10, b: 10 }; // site background #0a0a0a
const LIGHT_TEXT = { r: 134, g: 239, b: 172 }; // site --text-strong #86efac

type Px = { data: Buffer; width: number; height: number };

async function loadTransparent(): Promise<Px> {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    // Distance from white → alpha (soft edges keep anti-aliasing).
    const dist = Math.max(255 - r, 255 - g, 255 - b);
    const a = Math.max(0, Math.min(1, (dist - 10) / 70));
    // Un-mix the white background from edge pixels so they don't look haloed on dark backgrounds.
    const un = (c: number) => (a > 0 ? Math.max(0, Math.min(255, Math.round((c - (1 - a) * 255) / a))) : 0);
    out[j] = un(r);
    out[j + 1] = un(g);
    out[j + 2] = un(b);
    out[j + 3] = Math.round(a * 255);
  }
  return { data: out, width: info.width, height: info.height };
}

const isText = (x: number, y: number) => x >= TEXT_X && (y >= TEXT_TOP_Y || x >= LEAF_TIP_MAX_X);

function transform(src: Px, fn: (x: number, y: number, px: Buffer, o: number) => void): Px {
  const data = Buffer.from(src.data);
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) fn(x, y, data, (y * src.width + x) * 4);
  return { ...src, data };
}

function bbox(p: Px) {
  let [x0, y0, x1, y1] = [p.width, p.height, 0, 0];
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++)
      if (p.data[(y * p.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

const png = (p: Px) => sharp(p.data, { raw: { width: p.width, height: p.height, channels: 4 } });

async function saveTrimmed(p: Px, file: string, maxWidth: number, pad = 8) {
  const b = bbox(p);
  const trimmed = await png(p)
    .extract(b)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  // Sized for 2–3× screens; keeps downloads small.
  await sharp(trimmed).resize({ width: maxWidth, withoutEnlargement: true }).png({ compressionLevel: 9, palette: false }).toFile(file);
  const meta = await sharp(file).metadata();
  console.log(`  ${file}  ${meta.width}×${meta.height}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const base = await loadTransparent();

  // Dark-site versions: lighten the dark-green text, keep the leaf gradient.
  const dark = transform(base, (x, y, d, o) => {
    if (d[o + 3] && isText(x, y)) {
      d[o] = LIGHT_TEXT.r;
      d[o + 1] = LIGHT_TEXT.g;
      d[o + 2] = LIGHT_TEXT.b;
    }
  });
  const noTagline = (p: Px) => transform(p, (_x, y, d, o) => void (y >= TAGLINE_TOP_Y && (d[o + 3] = 0)));
  const leafOnly = transform(base, (x, y, d, o) => void (isText(x, y) && (d[o + 3] = 0)));

  console.log("Writing logo assets:");
  await saveTrimmed(dark, `${OUT}/logo-full-dark.png`, 1000);
  await saveTrimmed(noTagline(dark), `${OUT}/logo-horizontal-dark.png`, 720);
  await saveTrimmed(base, `${OUT}/logo-full-light.png`, 1000);

  // Square leaf mark
  const lb = bbox(leafOnly);
  const side = Math.max(lb.width, lb.height);
  const leafPng = await png(leafOnly).extract(lb).png().toBuffer();
  // Composite inputs must be buffers, not sharp instances
  const leafBuf = async (size: number) => sharp(leafPng).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await leafBuf(472), gravity: "center" }])
    .png()
    .toFile(`${OUT}/logo-mark.png`);
  console.log(`  ${OUT}/logo-mark.png  512×512 (leaf ${side}px source)`);
  await sharp({ create: { width: 512, height: 512, channels: 4, background: { ...BG, alpha: 1 } } })
    .composite([{ input: await leafBuf(400), gravity: "center" }])
    .png()
    .toFile("src/app/icon.png");
  await sharp({ create: { width: 180, height: 180, channels: 4, background: { ...BG, alpha: 1 } } })
    .composite([{ input: await leafBuf(136), gravity: "center" }])
    .png()
    .toFile("src/app/apple-icon.png");
  console.log("  src/app/icon.png 512×512, src/app/apple-icon.png 180×180");

  // Link-preview image
  const full = await sharp(`${OUT}/logo-full-dark.png`).resize({ width: 900 }).png().toBuffer();
  await sharp(`${OUT}/logo-mark.png`).resize(256).png({ compressionLevel: 9 }).toFile(`${OUT}/logo-mark-256.png`);
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: { ...BG, alpha: 1 } } })
    .composite([{ input: full, gravity: "center" }])
    .png()
    .toFile("src/app/opengraph-image.png");
  console.log("  src/app/opengraph-image.png 1200×630");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
