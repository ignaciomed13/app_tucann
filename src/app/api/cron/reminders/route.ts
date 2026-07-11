import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeReminders,
  computeReprocannReminder,
} from "@/lib/notifications/reminders";
import { sendPush } from "@/lib/notifications/web-push";
import { SANITY_ISSUE_LABELS } from "@/lib/logs/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron diario (Vercel Cron). Protegido con CRON_SECRET: Vercel envía
// Authorization: Bearer <CRON_SECRET> automáticamente si la variable existe.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "no autorizado" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const today = new Date();

  // Suscripciones agrupadas por usuario.
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  const subsByUser = new Map<
    string,
    { endpoint: string; p256dh: string; auth: string }[]
  >();
  for (const s of subs ?? []) {
    const arr = subsByUser.get(s.user_id) ?? [];
    arr.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
    subsByUser.set(s.user_id, arr);
  }
  if (subsByUser.size === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: "sin suscripciones" });
  }

  // Cultivos de usuarios con suscripción.
  const userIds = [...subsByUser.keys()];
  const { data: grows } = await supabase
    .from("grows")
    .select("id, user_id, name, plant_type, start_date")
    .in("user_id", userIds);

  let sent = 0;

  // --- Recordatorios a nivel USUARIO: vencimiento del REPROCANN. ---
  // Independientes de los cultivos: aplican aunque no haya ninguno activo.
  const [{ data: settings }, { data: sentUserRows }] = await Promise.all([
    supabase
      .from("user_settings")
      .select("user_id, reprocann_expires_on")
      .in("user_id", userIds)
      .not("reprocann_expires_on", "is", null),
    supabase
      .from("sent_user_reminders")
      .select("user_id, kind, dedupe_key")
      .in("user_id", userIds),
  ]);
  const alreadySentUser = new Set(
    (sentUserRows ?? []).map((r) => `${r.user_id}|${r.kind}|${r.dedupe_key}`)
  );
  const toRecordUser: { user_id: string; kind: string; dedupe_key: string }[] =
    [];
  for (const s of settings ?? []) {
    if (!s.reprocann_expires_on) continue;
    const r = computeReprocannReminder(s.reprocann_expires_on, today);
    if (!r) continue;
    if (alreadySentUser.has(`${s.user_id}|${r.kind}|${r.dedupeKey}`)) continue;
    let delivered = 0;
    for (const sub of subsByUser.get(s.user_id) ?? []) {
      try {
        await sendPush(sub, r);
        sent++;
        delivered++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    }
    if (delivered > 0) {
      toRecordUser.push({
        user_id: s.user_id,
        kind: r.kind,
        dedupe_key: r.dedupeKey,
      });
    }
  }
  if (toRecordUser.length > 0) {
    await supabase.from("sent_user_reminders").upsert(toRecordUser, {
      onConflict: "user_id,kind,dedupe_key",
      ignoreDuplicates: true,
    });
  }

  if (!grows || grows.length === 0) {
    return NextResponse.json({ ok: true, sent });
  }

  // Últimos logs de riego y sanidad por cultivo (una sola query).
  const growIds = grows.map((g) => g.id);
  const { data: logs } = await supabase
    .from("logs")
    .select("grow_id, type, log_date, data")
    .in("grow_id", growIds)
    .in("type", ["watering", "sanidad"])
    .order("log_date", { ascending: false });

  // Recordatorios ya enviados (para no repetir el mismo aviso).
  const { data: sentRows } = await supabase
    .from("sent_reminders")
    .select("grow_id, kind, dedupe_key")
    .in("grow_id", growIds);
  const alreadySent = new Set(
    (sentRows ?? []).map((r) => `${r.grow_id}|${r.kind}|${r.dedupe_key}`)
  );

  const lastWatering = new Map<string, string>();
  const lastSanidad = new Map<string, { date: string; issue: string | null }>();
  for (const l of logs ?? []) {
    if (l.type === "watering" && !lastWatering.has(l.grow_id)) {
      lastWatering.set(l.grow_id, l.log_date);
    }
    if (l.type === "sanidad" && !lastSanidad.has(l.grow_id)) {
      lastSanidad.set(l.grow_id, {
        date: l.log_date,
        issue: (l.data as { issue?: string } | null)?.issue ?? null,
      });
    }
  }

  const toRecord: { grow_id: string; kind: string; dedupe_key: string }[] = [];
  for (const g of grows) {
    const san = lastSanidad.get(g.id);
    const reminders = computeReminders(
      {
        name: g.name,
        plant_type: g.plant_type,
        start_date: g.start_date,
        lastWateringDate: lastWatering.get(g.id) ?? null,
        lastSanidadDate: san?.date ?? null,
        lastSanidadIssueLabel: san?.issue
          ? SANITY_ISSUE_LABELS[san.issue] ?? san.issue
          : null,
      },
      today,
      `/dashboard/grows/${g.id}`
    );
    if (reminders.length === 0) continue;

    for (const r of reminders) {
      if (alreadySent.has(`${g.id}|${r.kind}|${r.dedupeKey}`)) continue;
      let delivered = 0;
      for (const s of subsByUser.get(g.user_id) ?? []) {
        try {
          await sendPush(s, r);
          sent++;
          delivered++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", s.endpoint);
          }
        }
      }
      // Solo se marca como enviado si llegó al menos a un dispositivo; si
      // todas las suscripciones fallaron, el próximo cron reintenta.
      if (delivered > 0) {
        toRecord.push({ grow_id: g.id, kind: r.kind, dedupe_key: r.dedupeKey });
      }
    }
  }

  if (toRecord.length > 0) {
    await supabase.from("sent_reminders").upsert(toRecord, {
      onConflict: "grow_id,kind,dedupe_key",
      ignoreDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, sent });
}
