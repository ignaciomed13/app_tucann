import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  buildGeneticsPrompt,
  GENETICS_DOC_MAX_BYTES,
  GENETICS_INFO_MAX_CHARS,
  GENETICS_SYSTEM_PROMPT,
  NO_GENETICS_DATA,
} from "@/lib/analysis/genetics";
import {
  generateAnalysis,
  GeminiError,
  type InlineFile,
} from "@/lib/analysis/gemini";

// Lee la ficha de una genética y la devuelve normalizada a texto.
//
// No cuelga de /grows/[id] a propósito: se usa también al CREAR un cultivo,
// cuando todavía no hay id. El archivo llega por Storage (mismo truco que las
// fotos de logs: esquiva el límite de body) y acá lo bajamos para mandárselo
// a Gemini.
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  interface GeneticsRequest {
    genetics?: string;
    notes?: string;
    docPath?: string;
  }

  let body: GeneticsRequest | null = null;
  try {
    body = (await req.json()) as GeneticsRequest | null;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const genetics = String(body?.genetics ?? "").trim();
  const notes = String(body?.notes ?? "").trim();
  const docPath = String(body?.docPath ?? "").trim();

  if (!notes && !docPath) {
    return NextResponse.json(
      { error: "Escribí algo de la genética o subí la ficha del banco." },
      { status: 400 }
    );
  }
  if (notes.length > GENETICS_INFO_MAX_CHARS) {
    return NextResponse.json(
      { error: "El texto de la genética es demasiado largo." },
      { status: 400 }
    );
  }

  const files: InlineFile[] = [];
  if (docPath) {
    // Defensa en profundidad: las políticas del bucket ya limitan cada usuario
    // a su carpeta, pero no bajamos un path ajeno ni por accidente.
    if (!docPath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Archivo inválido." }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: blob } = await supabase.storage
      .from("grow-photos")
      .download(docPath);
    if (!blob) {
      return NextResponse.json(
        { error: "No se pudo leer el archivo que subiste." },
        { status: 404 }
      );
    }
    if (blob.size > GENETICS_DOC_MAX_BYTES) {
      return NextResponse.json(
        { error: "El archivo es muy pesado. Probá con uno de hasta 8 MB." },
        { status: 413 }
      );
    }

    files.push({
      mimeType: blob.type || "application/pdf",
      dataBase64: Buffer.from(await blob.arrayBuffer()).toString("base64"),
    });
  }

  try {
    // La ficha es corta y acotada: no necesita el presupuesto del análisis.
    const info = await generateAnalysis(
      GENETICS_SYSTEM_PROMPT,
      buildGeneticsPrompt(genetics, notes, files.length > 0),
      files,
      { maxOutputTokens: 700 }
    );

    if (info.trim().toUpperCase().startsWith(NO_GENETICS_DATA)) {
      return NextResponse.json(
        {
          error:
            "No encontré datos de la genética ahí. Probá con una foto más nítida de la ficha, el PDF del banco, o escribilos a mano.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ info: info.slice(0, GENETICS_INFO_MAX_CHARS) });
  } catch (err) {
    if (err instanceof GeminiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Error inesperado al leer la ficha." },
      { status: 500 }
    );
  }
}
