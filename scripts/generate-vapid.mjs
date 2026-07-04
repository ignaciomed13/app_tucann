// Genera claves VAPID para Web Push y las agrega a .env.local (una sola vez).
// La privada NO se imprime; queda solo en .env.local (gitignored).
import webpush from "web-push";
import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

let existing = "";
try {
  existing = readFileSync(envPath, "utf8");
} catch {
  // sin .env.local aún
}

if (existing.includes("VAPID_PRIVATE_KEY")) {
  console.log("Ya hay claves VAPID en .env.local — no se sobreescriben.");
  process.exit(0);
}

const keys = webpush.generateVAPIDKeys();
appendFileSync(
  envPath,
  `\n# Web Push (VAPID)\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\n`
);

console.log("✓ Claves VAPID generadas y agregadas a .env.local");
console.log("");
console.log("Public key (cargar en Vercel como NEXT_PUBLIC_VAPID_PUBLIC_KEY):");
console.log(keys.publicKey);
console.log("");
console.log("La private key quedó en .env.local (copiala a Vercel como VAPID_PRIVATE_KEY).");
