"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  WrongSecretError,
  createVault,
  rewrapPasswordEnvelope,
  unlockVault,
  type VaultBlobs,
} from "@/lib/crypto/e2e";
import {
  generateRecoveryPhrase,
  isValidRecoveryPhrase,
  normalizeRecoveryPhrase,
} from "@/lib/crypto/recovery";
import {
  clearUnlockedKey,
  loadUnlockedKey,
  saveUnlockedKey,
} from "@/lib/crypto/key-store";

const PrivateKeyContext = createContext<CryptoKey | null>(null);

// Solo se puede llamar dentro del gate, que no renderiza a sus hijos hasta
// tener la clave: por eso el tipo no es nullable.
export function useMyPrivateKey(): CryptoKey {
  const key = useContext(PrivateKeyContext);
  if (!key) throw new Error("useMyPrivateKey fuera del E2eGate");
  return key;
}

const VAULT_COLUMNS =
  "public_key, wrapped_private_key, wrapped_private_key_iv, password_salt, password_wrapped_mk, password_wrapped_mk_iv, recovery_salt, recovery_wrapped_mk, recovery_wrapped_mk_iv";

type Stage =
  | { name: "loading" }
  | { name: "setup" }
  | { name: "phrase"; phrase: string; privateKey: CryptoKey }
  | { name: "locked"; vault: VaultBlobs }
  | { name: "unlocked"; privateKey: CryptoKey }
  | { name: "broken"; message: string };

const card =
  "rounded-2xl border border-[color:var(--border)] bg-white p-6 shadow-sm";
const field =
  "w-full rounded-lg border border-[color:var(--border)] px-3 py-2.5";
const primary =
  "self-start rounded-full bg-green-700 px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50";

export function E2eGate({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [stage, setStage] = useState<Stage>({ name: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // La base manda, no el caché: si la identidad se borró del servidor, una
      // clave que quedó en este navegador no sirve para nada y daría por
      // desbloqueada una cuenta sin clave pública publicada (nadie podría
      // escribirle y nada sería descifrable).
      const supabase = createClient();
      const { data: vault, error } = await supabase
        .from("user_key_vault")
        .select(VAULT_COLUMNS)
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        setStage({ name: "broken", message: error.message });
        return;
      }
      if (!vault) {
        await clearUnlockedKey(userId);
        if (!cancelled) setStage({ name: "setup" });
        return;
      }

      const cached = await loadUnlockedKey(userId);
      if (cancelled) return;
      if (cached) {
        setStage({ name: "unlocked", privateKey: cached });
        return;
      }

      // Reparación: si la app murió entre los dos inserts, la clave pública
      // puede faltar. Sin ella nadie te puede escribir. La re-publicamos desde
      // la copia que guarda la bóveda.
      const { data: published } = await supabase
        .from("user_public_keys")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!published) {
        await supabase
          .from("user_public_keys")
          .insert({ user_id: userId, public_key: vault.public_key });
      }

      if (!cancelled) setStage({ name: "locked", vault });
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const unlocked = useCallback(
    async (privateKey: CryptoKey) => {
      // Guardar la clave es una comodidad, no un requisito. Si el navegador no
      // deja (incógnito, almacenamiento lleno, IndexedDB bloqueada), se sigue
      // con la clave en memoria: se usa igual y en la próxima visita se vuelve
      // a pedir la contraseña. Antes, un fallo acá dejaba al usuario afuera.
      try {
        await saveUnlockedKey(userId, privateKey);
      } catch {
        // Sin caché, pero perfectamente usable en esta sesión.
      }
      setStage({ name: "unlocked", privateKey });
    },
    [userId]
  );

  if (stage.name === "unlocked") {
    return (
      <PrivateKeyContext.Provider value={stage.privateKey}>
        {children}
      </PrivateKeyContext.Provider>
    );
  }

  if (stage.name === "loading") {
    return (
      <p className={`${card} text-sm text-[color:var(--muted)]`}>
        Abriendo tus mensajes…
      </p>
    );
  }

  if (stage.name === "broken") {
    return (
      <p className={`${card} text-sm text-red-700`}>
        No pudimos abrir tus mensajes cifrados: {stage.message}
      </p>
    );
  }

  if (stage.name === "setup") {
    return (
      <SetupForm
        userId={userId}
        onCreated={(phrase, privateKey) =>
          setStage({ name: "phrase", phrase, privateKey })
        }
      />
    );
  }

  if (stage.name === "phrase") {
    return (
      <PhraseHandoff
        phrase={stage.phrase}
        onConfirmed={() => unlocked(stage.privateKey)}
      />
    );
  }

  return <UnlockForm userId={userId} vault={stage.vault} onUnlocked={unlocked} />;
}

// Primera vez: se genera la identidad y se guardan los sobres cerrados.
function SetupForm({
  userId,
  onCreated,
}: {
  userId: string;
  onCreated: (phrase: string, privateKey: CryptoKey) => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      const phrase = generateRecoveryPhrase();
      const { publicKey, vault, privateKey } = await createVault(
        password,
        phrase
      );

      const supabase = createClient();
      // La bóveda primero: guarda una copia de la clave pública, así que si
      // esto sale bien el estado siempre es reparable.
      const { error: vaultError } = await supabase
        .from("user_key_vault")
        .insert({ user_id: userId, public_key: publicKey, ...vault });
      if (vaultError) throw new Error(vaultError.message);

      const { error: keyError } = await supabase
        .from("user_public_keys")
        .insert({ user_id: userId, public_key: publicKey });
      if (keyError) throw new Error(keyError.message);

      onCreated(phrase, privateKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar el cifrado.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-4`}>
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">🔐 Activá tus mensajes cifrados</h2>
        <p className="text-sm text-[color:var(--muted)]">
          Tus mensajes privados se cifran en tu dispositivo. Ni nosotros podemos
          leerlos: el servidor solo guarda texto cifrado. Para empezar,
          confirmá tu contraseña — con ella se protege tu clave, y por eso nunca
          sale de este navegador.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Tu contraseña
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className={field}
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy || !password} className={primary}>
        {busy ? "Generando tus claves…" : "Activar"}
      </button>
      {busy && <Slow />}
    </form>
  );
}

// Derivar la clave desde la contraseña es lento a propósito: es lo que hace
// cara la fuerza bruta contra la bóveda. En un celular son varios segundos, y
// sin este aviso parece que la app se colgó.
function Slow() {
  return (
    <p className="text-xs font-medium text-[color:var(--muted)]">
      Puede tardar unos segundos. Es a propósito: esa demora es lo que hace
      difícil adivinar tu contraseña por fuerza bruta.
    </p>
  );
}

const WORDS_TO_VERIFY = 3;

// Posiciones al azar para el control. Math.random alcanza: esto es una barrera
// contra la distracción, no contra un atacante.
function pickPositions(total: number, count: number): number[] {
  const all = Array.from({ length: total }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, count).sort((a, b) => a - b);
}

// La frase se muestra UNA sola vez. Después de esto no existe en ningún lado
// donde podamos recuperarla: solo abre la bóveda, no se guarda en claro.
//
// Por eso no alcanza con un "ya la anoté": ese checkbox lo tilda cualquiera
// sin anotar nada, y el precio de esa mentira son todos sus mensajes. Se pide
// escribir algunas palabras salteadas, como hacen las billeteras de cripto.
function PhraseHandoff({
  phrase,
  onConfirmed,
}: {
  phrase: string;
  onConfirmed: () => void;
}) {
  const words = phrase.split(" ");
  const [step, setStep] = useState<"show" | "verify">("show");
  const [positions] = useState(() =>
    pickPositions(words.length, WORDS_TO_VERIFY)
  );
  const [answers, setAnswers] = useState<string[]>(() =>
    Array(WORDS_TO_VERIFY).fill("")
  );
  const [error, setError] = useState<string | null>(null);

  if (step === "show") {
    return (
      <div className={`${card} flex flex-col gap-4`}>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-extrabold">
            📝 Anotá tu frase de recuperación
          </h2>
          <p className="text-sm text-[color:var(--muted)]">
            Estas 16 palabras son la única forma de recuperar tus mensajes si
            alguna vez olvidás tu contraseña. Escribilas en un papel, en orden.{" "}
            <strong className="text-[color:var(--ink)]">
              No te las vamos a poder mostrar de nuevo ni recuperar por vos.
            </strong>{" "}
            En la pantalla siguiente te vamos a pedir algunas para confirmar.
          </p>
        </div>

        <ol className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-[color:var(--surface,#f6f5ee)] p-4 sm:grid-cols-4">
          {words.map((w, i) => (
            <li key={`${w}-${i}`} className="flex gap-2 text-sm">
              <span className="w-5 shrink-0 text-right text-[color:var(--faint)]">
                {i + 1}
              </span>
              <span className="font-bold">{w}</span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => setStep("verify")}
          className={primary}
        >
          Ya las anoté
        </button>
      </div>
    );
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    const ok = positions.every(
      (p, i) => normalizeRecoveryPhrase(answers[i]) === words[p]
    );
    if (!ok) {
      setError("Alguna no coincide. Revisá tu papel y probá de nuevo.");
      return;
    }
    onConfirmed();
  }

  return (
    <form onSubmit={verify} className={`${card} flex flex-col gap-4`}>
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">✅ Confirmá que las anotaste</h2>
        <p className="text-sm text-[color:var(--muted)]">
          Escribí estas {WORDS_TO_VERIFY} palabras mirando tu papel.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {positions.map((p, i) => (
          <label key={p} className="flex flex-col gap-1.5 text-sm font-bold">
            Palabra {p + 1}
            <input
              value={answers[i]}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
                setError(null);
              }}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              className={field}
            />
          </label>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primary}>
          Entrar a mis mensajes
        </button>
        {/* Volver a verlas es a propósito: todavía no guardamos nada y el
            objetivo es que no se saltee el paso por distracción, no impedir
            que alguien haga trampa consigo mismo. */}
        <button
          type="button"
          onClick={() => {
            setStep("show");
            setError(null);
          }}
          className="text-sm font-bold text-green-800 hover:underline"
        >
          Volver a verlas
        </button>
      </div>
    </form>
  );
}

// Dispositivo nuevo (o el mismo después de limpiar los datos del navegador).
function UnlockForm({
  userId,
  vault,
  onUnlocked,
}: {
  userId: string;
  vault: VaultBlobs;
  onUnlocked: (key: CryptoKey) => void;
}) {
  const [mode, setMode] = useState<"password" | "recovery">("password");
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "password") {
        onUnlocked(await unlockVault(vault, password, "password"));
        return;
      }

      if (!isValidRecoveryPhrase(phrase)) {
        setError("Esa no es una frase válida: son 16 palabras del listado.");
        setBusy(false);
        return;
      }

      // Con la frase aprovechamos para re-envolver la clave maestra con la
      // contraseña actual; si no, habría que escribir las 16 palabras siempre.
      const normalized = normalizeRecoveryPhrase(phrase);
      const renewed = await rewrapPasswordEnvelope(
        vault,
        normalized,
        newPassword
      );
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("user_key_vault")
        .update({ ...renewed, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (updateError) throw new Error(updateError.message);

      onUnlocked(await unlockVault({ ...vault, ...renewed }, newPassword, "password"));
    } catch (e) {
      setError(
        e instanceof WrongSecretError
          ? mode === "password"
            ? "Esa no es tu contraseña."
            : "Esa frase no corresponde a esta cuenta."
          : e instanceof Error
            ? e.message
            : "No se pudo desbloquear."
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${card} flex flex-col gap-4`}>
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">🔐 Desbloqueá tus mensajes</h2>
        <p className="text-sm text-[color:var(--muted)]">
          Tus mensajes están cifrados y este dispositivo todavía no tiene tu
          clave. Se queda guardada acá, así que esto se hace una sola vez por
          navegador.
        </p>
      </div>

      {mode === "password" ? (
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Tu contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className={field}
          />
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Tu frase de recuperación
            <textarea
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              rows={3}
              placeholder="Las 16 palabras, separadas por espacios"
              required
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Tu contraseña actual
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={field}
            />
            <span className="text-xs font-medium text-[color:var(--muted)]">
              Para no tener que escribir la frase cada vez.
            </span>
          </label>
        </>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {busy && <Slow />}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={primary}>
          {busy ? "Desbloqueando…" : "Desbloquear"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "password" ? "recovery" : "password");
            setError(null);
          }}
          className="text-sm font-bold text-green-800 hover:underline"
        >
          {mode === "password"
            ? "Olvidé mi contraseña"
            : "Volver a usar la contraseña"}
        </button>
      </div>
    </form>
  );
}
