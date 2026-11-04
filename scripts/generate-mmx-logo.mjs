/**
 * Generate public/mmx-logo.png — square 512×512 MMX mark for Organization JSON-LD.
 * Mirrors the favicon (src/app/icon.tsx): #0b0d11 field, #3d9cf0 "MMX".
 * Glyphs are drawn as paths so output does not depend on installed fonts.
 *
 * Usage: node scripts/generate-mmx-logo.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SIZE = 512;
const BG = "#0b0d11";
const FG = "#3d9cf0";
const STROKE = 22;
const TOP = 190;
const BOTTOM = 322;
const W = 92;
const GAP = 46;
const LEFT = (SIZE - (3 * W + 2 * GAP)) / 2;

const m = (x0) =>
  `M${x0} ${BOTTOM} L${x0} ${TOP} L${x0 + W / 2} ${(TOP + BOTTOM) / 2 + 4} L${x0 + W} ${TOP} L${x0 + W} ${BOTTOM}`;
const x = (x0) =>
  `M${x0} ${TOP} L${x0 + W} ${BOTTOM} M${x0 + W} ${TOP} L${x0} ${BOTTOM}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>
  <g fill="none" stroke="${FG}" stroke-width="${STROKE}" stroke-linejoin="bevel" stroke-linecap="butt">
    <path d="${m(LEFT)}"/>
    <path d="${m(LEFT + W + GAP)}"/>
    <path d="${x(LEFT + 2 * (W + GAP))}"/>
  </g>
</svg>`;

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "..", "public", "mmx-logo.png");
await mkdir(path.dirname(out), { recursive: true });
const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
await writeFile(out, png);
console.log(`Wrote ${out} (${png.length} bytes, ${SIZE}x${SIZE})`);
