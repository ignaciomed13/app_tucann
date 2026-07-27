// Guarda la clave privada ya desbloqueada en IndexedDB, para no tener que
// pedir la contraseña en cada visita.
//
// Se guarda el objeto CryptoKey, no sus bytes: como se importó NO extraíble,
// ni siquiera nuestro propio JS puede volver a leer el material de la clave —
// solo usarla para derivar. Un XSS podría descifrar mensajes mientras la
// pestaña esté abierta, pero no puede robarse la clave y llevársela.
//
// Es por dispositivo y por navegador: en uno nuevo hay que desbloquear otra vez.

const DB_NAME = "tucann-e2e";
const STORE = "keys";

// La entrada va por usuario: en un mismo navegador pueden pasar varias cuentas
// (la propia y una de prueba, o dos personas en la misma compu). Con una clave
// fija, la segunda cuenta encontraba la clave de la primera, creía estar
// desbloqueada y no podía descifrar nada.
function keyId(userId: string): string {
  return `dm-private-key:${userId}`;
}

// Una sola conexión para toda la pestaña. Antes se abría una por operación y
// no se cerraba ninguna: las conexiones se acumulaban y cualquier borrado o
// migración de la base quedaba bloqueado detrás de ellas.
let connection: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (connection) return connection;

  connection = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // Sin esto, si otra pestaña está borrando la base el open no se resuelve
    // NUNCA y la pantalla de mensajes se queda cargando para siempre.
    req.onblocked = () => reject(new Error("IndexedDB bloqueada"));
  });

  // Un fallo no puede quedar cacheado: el próximo intento tiene que reintentar.
  connection.catch(() => {
    connection = null;
  });
  return connection;
}

// Ninguna lectura de caché puede dejar la pantalla colgada: si IndexedDB no
// contesta, se sigue como si no hubiera clave guardada y se pide la contraseña.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("IndexedDB no respondió")), ms)
    ),
  ]);
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function saveUnlockedKey(
  userId: string,
  key: CryptoKey
): Promise<void> {
  await tx("readwrite", (s) => s.put(key, keyId(userId)));
}

export async function loadUnlockedKey(
  userId: string
): Promise<CryptoKey | null> {
  try {
    const stored = await withTimeout(
      tx<unknown>("readonly", (s) => s.get(keyId(userId))),
      3000
    );
    // En modo incógnito o con el almacenamiento bloqueado esto puede fallar o
    // devolver cualquier cosa: mejor pedir la contraseña que romper la pantalla.
    return stored instanceof CryptoKey ? stored : null;
  } catch {
    return null;
  }
}

export async function clearUnlockedKey(userId: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(keyId(userId)));
  } catch {
    // Si no se puede limpiar, no hay nada mejor que hacer desde acá.
  }
}
