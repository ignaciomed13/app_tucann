import "server-only";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export class GeminiError extends Error {}

export interface InlineImage {
  mimeType: string;
  dataBase64: string;
}

// Llama a Gemini server-side. La API key nunca sale del servidor.
// Acepta imágenes opcionales (multimodal) para diagnóstico visual.
export async function generateAnalysis(
  systemPrompt: string,
  userPrompt: string,
  images: InlineImage[] = []
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY no está configurada en el servidor.");
  }

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: userPrompt }];
  for (const img of images) {
    parts.push({
      inlineData: { mimeType: img.mimeType, data: img.dataBase64 },
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
        maxOutputTokens: 1200,
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
