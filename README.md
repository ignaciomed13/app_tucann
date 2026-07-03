# App Cultivo

Journal de cultivo de cannabis, multi-tenant (datos aislados por usuario con Row
Level Security). Registra cultivos y logs, calcula la fase del ciclo, alerta por
tamaño de maceta, planifica cosecha perpetua y genera análisis agronómico con IA.

## Stack

- **Next.js** (App Router) — frontend + API routes
- **Supabase** — Postgres + Auth, con RLS para aislar datos por usuario
- **Google Gemini** — análisis agronómico server-side (`gemini-2.5-flash`)
- **Vercel** — deploy

## Funcionalidad

- Auth por email/contraseña (Supabase Auth).
- Cultivos con genética, tipo de planta (auto/fotoperiódica), sustrato, ambiente,
  iluminación y maceta.
- Ciclo fase-aware: 19 semanas fotoperiódica / 12 autofloreciente.
- 6 tipos de log: ambiental, riego, nutrición, observación, trasplante y
  poda/entrenamiento.
- Alertas de maceta chica (las automáticas no se trasplantan).
- Riego sugerido según sustrato.
- Cosecha perpetua: timeline de cosechas y planificador de escalonado.
- Análisis con IA server-side (la API key nunca se expone al cliente).

## Setup local

1. Instalá dependencias:

   ```bash
   npm install
   ```

2. Copiá `.env.local.example` a `.env.local` y completá:

   ```
   NEXT_PUBLIC_SUPABASE_URL=        # Supabase → Settings → API
   NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase → Settings → API
   GEMINI_API_KEY=                  # https://aistudio.google.com/apikey
   ```

3. Corré las migraciones de `supabase/migrations/` en el SQL Editor de Supabase
   (en orden por nombre de archivo).

4. En Supabase → Authentication → Email, desactivá "Confirm email" para desarrollo
   (o dejalo activo y confirmá los usuarios por email).

5. Dev server:

   ```bash
   npm run dev
   ```

## Tests

```bash
npm run test    # vitest (lógica pura: ciclo, validación, prompt, planificación)
npm run build   # build de producción + typecheck
npm run lint
```

## Deploy en Vercel

1. Subí el repo a GitHub e importalo en Vercel.
2. Cargá las 3 variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`) en el dashboard de Vercel.
3. Asegurate de haber corrido todas las migraciones en el proyecto de Supabase de
   producción.
