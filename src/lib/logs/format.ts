import type { LogData, LogType } from "@/lib/supabase/database.types";
import {
  TRAINING_TECHNIQUE_LABELS,
  SANITY_ISSUE_LABELS,
} from "@/lib/logs/validation";

// Resumen de una línea del contenido de un log, según su tipo. Se usa en el
// historial de la ficha, en el prompt de análisis IA y en el export a PDF.
export function formatLogData(type: LogType, data: LogData): string {
  switch (type) {
    case "environmental": {
      const env = data as { temperature_c?: number; humidity_pct?: number; ec?: number; ph?: number };
      return [
        env.temperature_c !== undefined ? `${env.temperature_c} °C` : null,
        env.humidity_pct !== undefined ? `${env.humidity_pct}% HR` : null,
        env.ec !== undefined ? `EC ${env.ec}` : null,
        env.ph !== undefined ? `pH ${env.ph}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    case "watering":
      return `${(data as { volume_l: number }).volume_l} L aplicados`;
    case "nutrition": {
      const n = data as { product: string; dose: string };
      return `${n.product} — ${n.dose}`;
    }
    case "observation":
      return (data as { notes: string }).notes;
    case "transplant":
      return `Nueva maceta: ${(data as { new_volume_l: number }).new_volume_l} L`;
    case "training": {
      const t = data as { technique: string; notes?: string };
      const label = TRAINING_TECHNIQUE_LABELS[t.technique] ?? t.technique;
      return t.notes ? `${label} — ${t.notes}` : label;
    }
    case "sanidad": {
      const s = data as { issue: string; severity: string; notes?: string };
      const label = SANITY_ISSUE_LABELS[s.issue] ?? s.issue;
      const base = `${label} (${s.severity})`;
      return s.notes ? `${base} — ${s.notes}` : base;
    }
    case "cosecha": {
      const h = data as { dry_weight_g: number; wet_weight_g?: number; notes?: string };
      const parts = [`${h.dry_weight_g} g secos`];
      if (h.wet_weight_g !== undefined) parts.push(`${h.wet_weight_g} g en fresco`);
      const base = parts.join(" · ");
      return h.notes ? `${base} — ${h.notes}` : base;
    }
  }
}
