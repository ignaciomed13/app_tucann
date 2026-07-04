"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const PHOTO_BUCKET = "grow-photos";

interface Photo {
  path: string;
  url: string; // preview (object URL para nuevas, signed URL para existentes)
}

// Sube fotos directo a Supabase Storage (evita el límite de body de las server
// actions) y expone los paths vía inputs ocultos "photos" para el form.
export function PhotoUpload({
  growId,
  userId,
  initial = [],
}: {
  growId: string;
  userId: string;
  initial?: Photo[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    const supabase = createClient();

    for (const file of files) {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${userId}/${growId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setError(`No se pudo subir ${file.name}: ${upErr.message}`);
        continue;
      }
      setPhotos((prev) => [
        ...prev,
        { path, url: URL.createObjectURL(file) },
      ]);
    }
    setUploading(false);
  }

  function remove(path: string) {
    setPhotos((prev) => prev.filter((p) => p.path !== path));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm">Fotos (opcional)</span>

      {photos.map((p) => (
        <input key={p.path} type="hidden" name="photos" value={p.path} />
      ))}

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.path} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt="foto"
                className="h-20 w-20 rounded-lg border border-[color:var(--border)] object-cover"
              />
              <button
                type="button"
                onClick={() => remove(p.path)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white"
                aria-label="Quitar foto"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="self-start cursor-pointer rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-neutral-50">
        {uploading ? "Subiendo…" : "📷 Agregar fotos"}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onSelect}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
