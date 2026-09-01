import "server-only";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export class GeminiError extends Error {}

// Archivo adjunto al prompt: foto de un log para diagnóstico visual, o la
// ficha del banco (imagen o PDF) para leer la genética.
export interface InlineFile {
  mimeType: string;
  dataBase64: string;
}

export interface GenerateOptions {
  // Techo de tokens de salida. El análisis de un cultivo necesita más aire
  // que la extracción de una ficha, que es corta y acotada.
  maxOutputTokens?: number;
}

// Llama a Gemini server-side. La API key nunca sale del servidor.
// Acepta archivos opcionales (multimodal): imágenes y PDFs.
export async function generateAnalysis(
  systemPrompt: string,
  userPrompt: string,
  files: InlineFile[] = [],
  options: GenerateOptions = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY no está configurada en el servidor.");
  }

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: userPrompt }];
  for (const file of files) {
    parts.push({
      inlineData: { mimeType: file.mimeType, data: file.dataBase64 },
    });
  }

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: options.maxOutputTokens ?? 1200,
        // gemini-2.5-flash razona por defecto y esos tokens consumen el
        // presupuesto de salida; lo desactivamos para esta tarea acotada.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiError(
      `Gemini respondió ${res.status}. ${detail.slice(0, 300)}`
    );
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiError("Gemini no devolvió texto de análisis.");
  }

  return text;
}
