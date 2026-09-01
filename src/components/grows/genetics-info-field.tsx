"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  GENETICS_DOC_ACCEPT,
  GENETICS_DOC_MAX_BYTES,
  GENETICS_INFO_MAX_CHARS,
} from "@/lib/analysis/genetics";
import { FieldLabel } from "@/components/ui/field";

const PHOTO_BUCKET = "grow-photos";

/**
 * Ficha de la genética: lo que dice el banco sobre la cepa.
 *
 * Tres entradas, un solo resultado. El cultivador puede tipear la ficha, sacarle
 * una foto al packaging o subir el PDF del semillero; imagen y PDF pasan por
 * /api/genetics-info, que los normaliza al mismo texto plano. Todo termina en el
 * mismo textarea editable, así lo que ve es exactamente lo que Tucu va a leer
 * después en cada análisis.
 *
 * El archivo sube directo a Storage (igual que las fotos de logs, para esquivar
 * el límite de body) bajo {userId}/genetics/{uuid}.{ext}: no necesita el id del
 * cultivo, así que el campo también funciona al crear uno nuevo.
 */
export function GeneticsInfoField({
  userId,
  genetics,
  defaultValue = "",
  defaultDocPath = "",
}: {
  userId: string;
  /** Nombre de la cepa ya tipeado arriba; va como pista para la lectura. */
  genetics: string;
  defaultValue?: string;
  defaultDocPath?: string;
}) {
  const [info, setInfo] = useState(defaultValue);
  const [docPath, setDocPath] = useState(defaultDocPath);
  const [docName, setDocName] = useState("");
  const [busy, setBusy] = useState<"subiendo" | "leyendo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > GENETICS_DOC_MAX_BYTES) {
      setError("El archivo es muy pesado. Probá con uno de hasta 8 MB.");
      return;
    }

    setError(null);
    setBusy("subiendo");

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `${userId}/genetics/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type });

    if (upErr) {
      setBusy(null);
      setError(`No se pudo subir el archivo: ${upErr.message}`);
      return;
    }

    setBusy("leyendo");
    try {
      const res = await fetch("/api/genetics-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genetics, docPath: path }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No se pudo leer la ficha.");
      } else {
        setInfo(json.info);
        setDocPath(path);
        setDocName(file.name);
      }
    } catch {
      setError("Error de red al leer la ficha.");
    } finally {
      setBusy(null);
    }
  }

  // Ordena a un formato parejo lo que el cultivador escribió a mano, sin
  // subir ningún archivo.
  async function tidyText() {
    const notes = info.trim();
    if (!notes) {
      setError("Escribí primero lo que sabés de la genética.");
      return;
    }

    setError(null);
    setBusy("leyendo");
    try {
      const res = await fetch("/api/genetics-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genetics, notes }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "No se pudo ordenar la ficha.");
      else setInfo(json.info);
    } catch {
      setError("Error de red al ordenar la ficha.");
    } finally {
      setBusy(null);
    }
  }

  function clearDoc() {
    setDocPath("");
    setDocName("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>Ficha de la genética (opcional)</FieldLabel>

      <textarea
        name="genetics_info"
        rows={6}
        maxLength={GENETICS_INFO_MAX_CHARS}
        value={info}
        onChange={(e) => setInfo(e.target.value)}
        disabled={busy !== null}
        placeholder={
          "Floración: 8 semanas\nAltura: 100-140 cm\nRendimiento: 500-600 g/m²\nResistencias: sensible a hongos por cogollo denso"
        }
        className="w-full rounded-[10px] border-[1.5px] border-[color:var(--border)] bg-white px-3 py-3 font-mono text-[13px] leading-relaxed text-[color:var(--ink)] disabled:opacity-60"
      />

      <input type="hidden" name="genetics_doc_path" value={docPath} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-50 disabled:opacity-50"
        >
          {busy === "subiendo"
            ? "Subiendo…"
            : busy === "leyendo"
              ? "Leyendo la ficha…"
              : "📄 Leer de imagen o PDF"}
        </button>

        {info.trim() !== "" && busy === null && (
          <button
            type="button"
            onClick={tidyText}
            className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-50"
          >
            ✨ Ordenar lo que escribí
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={GENETICS_DOC_ACCEPT}
          onChange={onSelect}
          className="hidden"
        />
      </div>

      {docPath && (
        <p className="flex items-center gap-2 text-xs text-[color:var(--faint)]">
          <span>📎 Ficha adjunta{docName ? `: ${docName}` : ""}</span>
          <button
            type="button"
            onClick={clearDoc}
            className="font-bold underline underline-offset-2"
          >
            Quitar
          </button>
        </p>
      )}

      <span className="text-xs text-[color:var(--faint)]">
        Lo que cargues acá manda sobre lo que Tucu crea saber de la cepa: usa
        estos tiempos de floración, altura y rendimiento para el análisis.
        Revisalo antes de guardar, la lectura automática puede equivocarse.
      </span>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
