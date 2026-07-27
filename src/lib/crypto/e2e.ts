// Criptografía de los mensajes privados. Corre SOLO en el browser: ninguna
// clave ni ningún texto en claro llega al servidor.
//
// Diseño:
// - Cada usuario tiene un par ECDH P-256. La pública va a la base (no es
//   secreta); la privada se guarda envuelta con una clave maestra al azar (MK).
// - De la MK se guardan DOS sobres cerrados: uno se abre con la contraseña y
//   otro con la frase de recuperación. Cambiar la contraseña re-envuelve un
//   solo sobre, y la frase es el camino alternativo a la misma clave.
// - Cada mensaje se cifra con AES-GCM. La clave sale de ECDH entre mi privada
//   y la pública del otro: da el MISMO secreto de los dos lados, así que cada
//   uno puede leer tanto lo que recibió como lo que mandó.
//
// LIMITACIÓN ACEPTADA (2026-07-26): sin secreto hacia adelante. Quien obtenga
// la contraseña de alguien desenvuelve su clave y lee todo su historial, no
// solo lo nuevo. Un ratchet tipo Signal quedó fuera de alcance.
//
// Todo lo que sale de acá va en base64 porque termina en columnas de texto.

// Alto a propósito: es la única barrera si alguien se roba la bóveda y prueba
// contraseñas por fuerza bruta. Tarda ~1s en un celular, y se paga una vez por
// dispositivo, no por mensaje.
const PBKDF2_ITERATIONS = 600_000;
const HKDF_INFO = "tucann:dm:v1";

// WebCrypto exige buffers respaldados por ArrayBuffer (no SharedArrayBuffer),
// y desde TS 5.7 Uint8Array es genérico sobre eso. Este alias evita repetir la
// anotación en cada firma.
type Bytes = Uint8Array<ArrayBuffer>;

function utf8(text: string): Bytes {
  return new TextEncoder().encode(text) as Bytes;
}

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) {
    throw new Error(
      "Este navegador no soporta el cifrado que usan los mensajes privados."
    );
  }
  return s;
}

export function toBase64(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function fromBase64(value: string): Bytes {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Los sobres tal cual viajan a la tabla user_key_vault.
export type VaultBlobs = {
  wrapped_private_key: string;
  wrapped_private_key_iv: string;
  password_salt: string;
  password_wrapped_mk: string;
  password_wrapped_mk_iv: string;
  recovery_salt: string;
  recovery_wrapped_mk: string;
  recovery_wrapped_mk_iv: string;
};

export type UnlockKind = "password" | "recovery";

// Se levanta cuando AES-GCM no valida: contraseña o frase equivocada. Es un
// tipo aparte para que la UI distingue "te equivocaste" de "algo se rompió".
export class WrongSecretError extends Error {
  constructor() {
    super("La contraseña o la frase de recuperación no coinciden.");
    this.name = "WrongSecretError";
  }
}

async function deriveKek(secret: string, salt: Bytes): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", utf8(secret), "PBKDF2", false, [
    "deriveKey",
  ]);
  return subtle().deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function seal(plain: Bytes, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await subtle().encrypt({ name: "AES-GCM", iv }, key, plain);
  return { data: toBase64(data), iv: toBase64(iv) };
}

async function open(
  data: string,
  iv: string,
  key: CryptoKey
): Promise<Bytes> {
  try {
    const plain = await subtle().decrypt(
      { name: "AES-GCM", iv: fromBase64(iv) },
      key,
      fromBase64(data)
    );
    return new Uint8Array(plain);
  } catch {
    // AES-GCM está autenticado: si falla, la clave derivada es la equivocada.
    throw new WrongSecretError();
  }
}

function importMasterKey(mk: Bytes): Promise<CryptoKey> {
  return subtle().importKey("raw", mk, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// La privada se importa NO extraíble: a partir de acá el JS puede usarla para
// derivar, pero ya no puede volver a leer sus bytes ni mandarlos a ningún lado.
function importPrivateKey(pkcs8: Bytes): Promise<CryptoKey> {
  return subtle().importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"]
  );
}

// Crea la identidad completa de un usuario nuevo. Devuelve lo que hay que
// guardar en la base y la clave privada ya lista para usar en esta sesión.
export async function createVault(
  password: string,
  recoveryPhrase: string
): Promise<{ publicKey: string; vault: VaultBlobs; privateKey: CryptoKey }> {
  const pair = await subtle().generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const publicKey = toBase64(await subtle().exportKey("spki", pair.publicKey));
  const pkcs8 = new Uint8Array(
    await subtle().exportKey("pkcs8", pair.privateKey)
  );

  const mk = crypto.getRandomValues(new Uint8Array(32));
  const mkKey = await importMasterKey(mk);
  const wrappedPrivate = await seal(pkcs8, mkKey);

  const passwordSalt = crypto.getRandomValues(new Uint8Array(16));
  const recoverySalt = crypto.getRandomValues(new Uint8Array(16));
  // En paralelo a propósito: son independientes y cada PBKDF2 cuesta entre uno
  // y varios segundos (bastante más en un celular). En serie, activar el
  // cifrado tardaba el doble sin ninguna razón.
  const [passwordEnvelope, recoveryEnvelope] = await Promise.all([
    deriveKek(password, passwordSalt).then((kek) => seal(mk, kek)),
    deriveKek(recoveryPhrase, recoverySalt).then((kek) => seal(mk, kek)),
  ]);

  return {
    publicKey,
    vault: {
      wrapped_private_key: wrappedPrivate.data,
      wrapped_private_key_iv: wrappedPrivate.iv,
      password_salt: toBase64(passwordSalt),
      password_wrapped_mk: passwordEnvelope.data,
      password_wrapped_mk_iv: passwordEnvelope.iv,
      recovery_salt: toBase64(recoverySalt),
      recovery_wrapped_mk: recoveryEnvelope.data,
      recovery_wrapped_mk_iv: recoveryEnvelope.iv,
    },
    // Re-importada no extraíble: la copia manipulable de los bytes muere acá.
    privateKey: await importPrivateKey(pkcs8),
  };
}

async function openMasterKey(
  vault: VaultBlobs,
  secret: string,
  kind: UnlockKind
): Promise<Bytes> {
  const [salt, data, iv] =
    kind === "password"
      ? [vault.password_salt, vault.password_wrapped_mk, vault.password_wrapped_mk_iv]
      : [vault.recovery_salt, vault.recovery_wrapped_mk, vault.recovery_wrapped_mk_iv];

  return open(data, iv, await deriveKek(secret, fromBase64(salt)));
}

// Abre la bóveda con la contraseña o con la frase. Tira WrongSecretError si el
// secreto no es el correcto.
export async function unlockVault(
  vault: VaultBlobs,
  secret: string,
  kind: UnlockKind
): Promise<CryptoKey> {
  const mk = await openMasterKey(vault, secret, kind);
  const pkcs8 = await open(
    vault.wrapped_private_key,
    vault.wrapped_private_key_iv,
    await importMasterKey(mk)
  );
  return importPrivateKey(pkcs8);
}

// Después de un reset de contraseña el sobre de la contraseña vieja quedó
// inservible. Se abre la MK con la frase y se vuelve a cerrar con la nueva.
export async function rewrapPasswordEnvelope(
  vault: VaultBlobs,
  recoveryPhrase: string,
  newPassword: string
): Promise<
  Pick<
    VaultBlobs,
    "password_salt" | "password_wrapped_mk" | "password_wrapped_mk_iv"
  >
> {
  const mk = await openMasterKey(vault, recoveryPhrase, "recovery");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const envelope = await seal(mk, await deriveKek(newPassword, salt));
  return {
    password_salt: toBase64(salt),
    password_wrapped_mk: envelope.data,
    password_wrapped_mk_iv: envelope.iv,
  };
}

// Clave de una conversación: ECDH da el mismo secreto de los dos lados, y HKDF
// lo convierte en una clave AES en vez de usar el secreto crudo.
export async function deriveConversationKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: string
): Promise<CryptoKey> {
  const theirKey = await subtle().importKey(
    "spki",
    fromBase64(theirPublicKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const shared = await subtle().deriveBits(
    { name: "ECDH", public: theirKey },
    myPrivateKey,
    256
  );
  const hkdf = await subtle().importKey("raw", shared, "HKDF", false, [
    "deriveKey",
  ]);
  return subtle().deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: utf8(HKDF_INFO),
    },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(
  text: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const sealed = await seal(utf8(text), key);
  return { ciphertext: sealed.data, iv: sealed.iv };
}

export async function decryptMessage(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  return new TextDecoder().decode(await open(ciphertext, iv, key));
}
