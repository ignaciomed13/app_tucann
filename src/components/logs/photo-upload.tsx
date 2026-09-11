"use client";

import { useRef, useState } from "react";
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
  disabled = false,
  onUploadingChange,
}: {
  growId: string;
  userId: string;
  initial?: Photo[];
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || uploading || disabled) return;

    setUploading(true);
    onUploadingChange?.(true);
    setError(null);

    try {
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
    } catch {
      setError("No se pudieron subir las fotos. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
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
                disabled={disabled || uploading}
                onClick={() => remove(p.path)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white disabled:opacity-50"
                aria-label="Quitar foto"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          disabled={disabled || uploading}
          className="min-h-11 rounded-full bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          📷 Sacar foto
        </button>
        <button
          type="button"
          onClick={() => galleryInput.current?.click()}
          disabled={disabled || uploading}
          className="min-h-11 rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-medium hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Elegir de galería
        </button>
        {/* La captura es de una foto; la galería mantiene la selección múltiple. */}
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Sacar foto"
          onChange={onSelect}
          disabled={disabled || uploading}
          className="hidden"
        />
        <input
          ref={galleryInput}
          type="file"
          accept="image/*"
          multiple
          aria-label="Elegir de galería"
          onChange={onSelect}
          disabled={disabled || uploading}
          className="hidden"
        />
      </div>

      {uploading && <p role="status" className="text-xs text-neutral-600">Subiendo fotos… Esperá para guardar el log.</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
