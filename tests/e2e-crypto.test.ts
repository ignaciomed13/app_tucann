import { describe, expect, it } from "vitest";
import {
  WrongSecretError,
  createVault,
  decryptMessage,
  deriveConversationKey,
  encryptMessage,
  rewrapPasswordEnvelope,
  unlockVault,
} from "@/lib/crypto/e2e";
import { generateRecoveryPhrase } from "@/lib/crypto/recovery";

// PBKDF2 con 600k iteraciones es lento a propósito: cada bóveda que se crea o
// se abre cuesta ~1s. Por eso los tests crean las mínimas posibles.
const TIMEOUT = 30_000;

async function nuevaIdentidad(password: string) {
  const recoveryPhrase = generateRecoveryPhrase();
  const created = await createVault(password, recoveryPhrase);
  return { ...created, recoveryPhrase };
}

describe("bóveda de claves", () => {
  it(
    "abre con la contraseña y también con la frase de recuperación",
    async () => {
      const { vault, recoveryPhrase } = await nuevaIdentidad("clave-secreta-1");

      await expect(
        unlockVault(vault, "clave-secreta-1", "password")
      ).resolves.toBeDefined();
      await expect(
        unlockVault(vault, recoveryPhrase, "recovery")
      ).resolves.toBeDefined();
    },
    TIMEOUT
  );

  it(
    "rechaza la contraseña equivocada con un error distinguible",
    async () => {
      const { vault } = await nuevaIdentidad("clave-secreta-2");
      await expect(
        unlockVault(vault, "no-es-esa", "password")
      ).rejects.toBeInstanceOf(WrongSecretError);
    },
    TIMEOUT
  );

  it(
    "guarda sobres inservibles por sí solos",
    async () => {
      const { vault } = await nuevaIdentidad("clave-secreta-3");
      // Esto es exactamente lo que ve el servidor. Nada de esto puede abrirse
      // sin la contraseña o la frase, que nunca salen del browser.
      const guardado = JSON.stringify(vault);
      expect(guardado).not.toContain("clave-secreta-3");
      for (const blob of Object.values(vault)) {
        expect(blob).toMatch(/^[A-Za-z0-9+/]+=*$/);
      }
    },
    TIMEOUT
  );

  it(
    "después de un reset de contraseña, la frase recupera el acceso",
    async () => {
      const { vault, recoveryPhrase } = await nuevaIdentidad("la-vieja");

      const renovado = await rewrapPasswordEnvelope(
        vault,
        recoveryPhrase,
        "la-nueva"
      );
      const actualizado = { ...vault, ...renovado };

      await expect(
        unlockVault(actualizado, "la-nueva", "password")
      ).resolves.toBeDefined();
      // La contraseña vieja ya no abre nada.
      await expect(
        unlockVault(actualizado, "la-vieja", "password")
      ).rejects.toBeInstanceOf(WrongSecretError);
      // Y la frase sigue funcionando: es el camino independiente a la MK.
      await expect(
        unlockVault(actualizado, recoveryPhrase, "recovery")
      ).resolves.toBeDefined();
    },
    TIMEOUT
  );
});

describe("mensajes", () => {
  it(
    "los dos lados de la conversación llegan a la misma clave",
    async () => {
      const ana = await nuevaIdentidad("clave-ana");
      const beto = await nuevaIdentidad("clave-beto");

      const claveDeAna = await deriveConversationKey(
        ana.privateKey,
        beto.publicKey
      );
      const claveDeBeto = await deriveConversationKey(
        beto.privateKey,
        ana.publicKey
      );

      // Ana escribe: Beto puede leerlo...
      const { ciphertext, iv } = await encryptMessage("hola beto", claveDeAna);
      expect(await decryptMessage(ciphertext, iv, claveDeBeto)).toBe("hola beto");
      // ...y Ana también, que si no perdería lo que ella misma mandó.
      expect(await decryptMessage(ciphertext, iv, claveDeAna)).toBe("hola beto");
    },
    TIMEOUT
  );

  it(
    "un tercero con su propia clave no puede leer nada",
    async () => {
      const ana = await nuevaIdentidad("clave-ana-2");
      const beto = await nuevaIdentidad("clave-beto-2");
      const intruso = await nuevaIdentidad("clave-intrusa");

      const claveDeAna = await deriveConversationKey(
        ana.privateKey,
        beto.publicKey
      );
      const { ciphertext, iv } = await encryptMessage("algo privado", claveDeAna);

      const claveDelIntruso = await deriveConversationKey(
        intruso.privateKey,
        ana.publicKey
      );
      await expect(
        decryptMessage(ciphertext, iv, claveDelIntruso)
      ).rejects.toBeInstanceOf(WrongSecretError);
    },
    TIMEOUT
  );

  it(
    "el mismo texto cifrado dos veces no da el mismo resultado",
    async () => {
      const ana = await nuevaIdentidad("clave-ana-3");
      const beto = await nuevaIdentidad("clave-beto-3");
      const clave = await deriveConversationKey(ana.privateKey, beto.publicKey);

      // IV al azar por mensaje: si no, se filtraría que dos mensajes son iguales.
      const uno = await encryptMessage("mismo texto", clave);
      const dos = await encryptMessage("mismo texto", clave);
      expect(uno.ciphertext).not.toBe(dos.ciphertext);
      expect(uno.iv).not.toBe(dos.iv);
    },
    TIMEOUT
  );

  it(
    "mensajes cortos distintos ocupan exactamente lo mismo",
    async () => {
      const ana = await nuevaIdentidad("clave-ana-5");
      const beto = await nuevaIdentidad("clave-beto-5");
      const clave = await deriveConversationKey(ana.privateKey, beto.publicKey);

      // Sin relleno, el largo del cifrado delataba el largo del texto: se
      // podía distinguir un "sí" de un "no me parece" sin descifrar nada.
      const corto = await encryptMessage("sí", clave);
      const largo = await encryptMessage(
        "no me parece, mejor lo hablamos mañana",
        clave
      );
      expect(corto.ciphertext.length).toBe(largo.ciphertext.length);
    },
    TIMEOUT
  );

  it(
    "el relleno no altera el texto, ni justo en el borde de un bloque",
    async () => {
      const ana = await nuevaIdentidad("clave-ana-6");
      const beto = await nuevaIdentidad("clave-beto-6");
      const clave = await deriveConversationKey(ana.privateKey, beto.publicKey);

      // 251/252/253 bytes: 252 es el último que entra en un bloque junto con
      // la cabecera de 4 bytes del largo.
      for (const n of [1, 251, 252, 253, 600]) {
        const texto = "a".repeat(n);
        const { ciphertext, iv } = await encryptMessage(texto, clave);
        expect(await decryptMessage(ciphertext, iv, clave)).toBe(texto);
      }
    },
    TIMEOUT
  );

  it(
    "un mensaje largo sí ocupa más que uno corto",
    async () => {
      const ana = await nuevaIdentidad("clave-ana-7");
      const beto = await nuevaIdentidad("clave-beto-7");
      const clave = await deriveConversationKey(ana.privateKey, beto.publicKey);

      // El relleno esconde el largo dentro de cada bloque, no entre bloques:
      // de un mensaje de 3000 caracteres se sigue sabiendo que es largo.
      const corto = await encryptMessage("hola", clave);
      const largo = await encryptMessage("a".repeat(3000), clave);
      expect(largo.ciphertext.length).toBeGreaterThan(corto.ciphertext.length);
    },
    TIMEOUT
  );

  it(
    "aguanta acentos, emojis y textos largos",
    async () => {
      const ana = await nuevaIdentidad("clave-ana-4");
      const beto = await nuevaIdentidad("clave-beto-4");
      const clave = await deriveConversationKey(ana.privateKey, beto.publicKey);

      const texto = "Ñandú 🌱 acentuación — " + "x".repeat(4000);
      const { ciphertext, iv } = await encryptMessage(texto, clave);
      expect(await decryptMessage(ciphertext, iv, clave)).toBe(texto);
    },
    TIMEOUT
  );
});
