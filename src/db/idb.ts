/** Camada mínima de acesso ao IndexedDB, sem dependências externas. */

export const DB_NAME = 'relicario';

/**
 * Versão 1 → 2 (segunda etapa de desenvolvimento).
 * A migração só ACRESCENTA stores e índices. Nenhuma linha existente é reescrita
 * nem removida aqui: os campos novos recebem valor padrão na leitura
 * (ver `normalize*` em db/archive.ts), o que mantém o arquivo do usuário intacto
 * mesmo que a atualização seja interrompida no meio.
 */
export const DB_VERSION = 2;

export const STORES = {
  memories: 'memories',
  people: 'people',
  categories: 'categories',
  attachments: 'attachments',
  capsules: 'capsules',
  settings: 'settings',
  collections: 'collections',
  sources: 'sources',
  history: 'history',
  reminders: 'reminders',
  meta: 'meta',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

/** Todas as stores que guardam conteúdo do usuário (usadas em backup/restauração). */
export const CONTENT_STORES: StoreName[] = [
  STORES.memories,
  STORES.people,
  STORES.categories,
  STORES.attachments,
  STORES.capsules,
  STORES.collections,
  STORES.sources,
  STORES.history,
  STORES.reminders,
];

let dbPromise: Promise<IDBDatabase> | null = null;

/** Migração acumulativa: cada bloco roda apenas se a store/índice ainda não existe. */
function upgrade(db: IDBDatabase, tx: IDBTransaction | null, oldVersion: number) {
  const ensureStore = (name: string, keyPath: string) =>
    db.objectStoreNames.contains(name) ? tx?.objectStore(name) : db.createObjectStore(name, { keyPath });

  const ensureIndex = (store: IDBObjectStore | undefined, name: string, keyPath: string) => {
    if (store && !store.indexNames.contains(name)) store.createIndex(name, keyPath);
  };

  // ---- v1 ----
  const memories = ensureStore(STORES.memories, 'id');
  ensureIndex(memories, 'occurredAt', 'occurredAt');
  ensureIndex(memories, 'createdAt', 'createdAt');

  const people = ensureStore(STORES.people, 'id');
  ensureIndex(people, 'name', 'name');

  ensureStore(STORES.categories, 'id');

  const attachments = ensureStore(STORES.attachments, 'id');
  ensureIndex(attachments, 'ownerId', 'ownerId');
  ensureIndex(attachments, 'memoryId', 'memoryId');

  const capsules = ensureStore(STORES.capsules, 'id');
  ensureIndex(capsules, 'openAt', 'openAt');

  ensureStore(STORES.settings, 'key');

  // ---- v2 ----
  if (oldVersion < 2) {
    ensureStore(STORES.collections, 'id');
    ensureStore(STORES.sources, 'id');
    const history = ensureStore(STORES.history, 'id');
    ensureIndex(history, 'memoryId', 'memoryId');
    ensureStore(STORES.reminders, 'id');
    ensureStore(STORES.meta, 'key');
  }
}

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este dispositivo não oferece armazenamento local (IndexedDB).'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => upgrade(req.result, req.transaction, event.oldVersion);
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error ?? new Error('Falha ao abrir o arquivo local.'));
    req.onblocked = () =>
      reject(new Error('O arquivo local está em uso por outra aba. Feche-a e tente de novo.'));
  });
  return dbPromise;
}

function run<T>(
  stores: StoreName | StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(stores, mode);
        let result: T;
        let settled = false;
        tx.oncomplete = () => {
          if (!settled) {
            settled = true;
            resolve(result);
          }
        };
        tx.onerror = () => {
          if (!settled) {
            settled = true;
            reject(tx.error ?? new Error('Operação não concluída.'));
          }
        };
        tx.onabort = () => {
          if (!settled) {
            settled = true;
            reject(tx.error ?? new Error('Operação cancelada.'));
          }
        };
        Promise.resolve(fn(tx)).then(
          (value) => {
            result = value;
          },
          (err) => {
            settled = true;
            try {
              tx.abort();
            } catch {
              /* transação já encerrada */
            }
            reject(err);
          },
        );
      }),
  );
}

export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  return run(store, 'readonly', (tx) => request(tx.objectStore(store).getAll() as IDBRequest<T[]>));
}

export async function getOne<T>(store: StoreName, id: IDBValidKey): Promise<T | undefined> {
  return run(store, 'readonly', (tx) =>
    request(tx.objectStore(store).get(id) as IDBRequest<T | undefined>),
  );
}

export async function getByIndex<T>(
  store: StoreName,
  index: string,
  value: IDBValidKey,
): Promise<T[]> {
  return run(store, 'readonly', (tx) =>
    request(tx.objectStore(store).index(index).getAll(value) as IDBRequest<T[]>),
  );
}

export async function put<T>(store: StoreName, value: T): Promise<void> {
  await run(store, 'readwrite', (tx) => request(tx.objectStore(store).put(value as never)));
}

export async function putMany<T>(store: StoreName, values: T[]): Promise<void> {
  if (!values.length) return;
  await run(store, 'readwrite', (tx) => {
    const os = tx.objectStore(store);
    return Promise.all(values.map((v) => request(os.put(v as never))));
  });
}

export async function remove(store: StoreName, id: IDBValidKey): Promise<void> {
  await run(store, 'readwrite', (tx) => request(tx.objectStore(store).delete(id)));
}

export async function removeMany(store: StoreName, ids: IDBValidKey[]): Promise<void> {
  if (!ids.length) return;
  await run(store, 'readwrite', (tx) => {
    const os = tx.objectStore(store);
    return Promise.all(ids.map((id) => request(os.delete(id))));
  });
}

export async function clearStores(stores: StoreName[]): Promise<void> {
  await run(stores, 'readwrite', (tx) =>
    Promise.all(stores.map((s) => request(tx.objectStore(s).clear()))),
  );
}

/**
 * Escreve em várias stores numa única transação. O IndexedDB garante atomicidade:
 * se qualquer passo falhar, a transação é abortada e NADA é gravado. É assim que a
 * restauração de backup evita deixar o arquivo do usuário num estado parcial.
 */
export async function transactWrite(
  stores: StoreName[],
  fn: (get: (s: StoreName) => IDBObjectStore) => Promise<unknown>,
): Promise<void> {
  await run(stores, 'readwrite', (tx) => fn((s) => tx.objectStore(s)));
}

export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  } catch {
    return null;
  }
}
