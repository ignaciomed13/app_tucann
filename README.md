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

## Notificaciones push

Dos caminos distintos, con prioridades distintas:

- **Conversación** (mensajes privados, respuestas y menciones del foro): salen
  al instante, con `Urgency: high`, para que Android no las retenga hasta la
  próxima ventana de Doze.
- **Recordatorios** (riego, fase, cosecha, sanidad, REPROCANN): los manda el
  cron diario (`vercel.json`), con `Urgency: normal` y TTL de 20 h. No son
  tiempo real y no vale la pena despertar el teléfono por ellos.

Si alguien reporta que un aviso llegó tarde, el dato está en los logs del
server (Vercel → Logs), filtrando por `[push-latency]`: el service worker
reporta cuánto pasó entre el envío y la entrega en el aparato.

```
[push-latency] kind=dm-push 3s                                  ← todo bien
[push-latency] kind=forum-push 1841s — entrega diferida ...      ← lo difirió el aparato
```

Latencia de segundos significa que el envío está bien y el atraso lo mete el
sistema operativo del teléfono: ahí se revisa el ahorro de batería de la app
instalada, no el código. Latencia alta con el teléfono despierto sí apunta al
server.

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
