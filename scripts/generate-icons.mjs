// Genera los PNG de la PWA a partir de public/icon.svg usando sharp.
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public", "icon.svg"));
const maskableSvg = readFileSync(join(root, "public", "icon-maskable.svg"));

const outputs = [
  { size: 192, name: "icon-192x192.png", src: svg },
  { size: 512, name: "icon-512x512.png", src: svg },
  { size: 180, name: "apple-icon.png", src: svg },
  // A sangre completa (sin esquinas transparentes) para Android maskable.
  { size: 512, name: "icon-512x512-maskable.png", src: maskableSvg },
];

for (const { size, name, src } of outputs) {
  await sharp(src)
    .resize(size, size)
    .png()
    .toFile(join(root, "public", name));
  console.log(`✓ public/${name} (${size}x${size})`);
}
