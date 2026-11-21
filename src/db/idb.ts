/** Camada mínima de acesso ao IndexedDB, sem dependências externas. */

export const DB_NAME = 'relicario';
export const DB_VERSION = 1;

export const STORES = {
  memories: 'memories',
  people: 'people',
  categories: 'categories',
  attachments: 'attachments',
  capsules: 'capsules',
  settings: 'settings',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function upgrade(db: IDBDatabase) {
  if (!db.objectStoreNames.contains(STORES.memories)) {
    const s = db.createObjectStore(STORES.memories, { keyPath: 'id' });
    s.createIndex('occurredAt', 'occurredAt');
    s.createIndex('createdAt', 'createdAt');
    s.createIndex('favorite', 'favorite');
    s.createIndex('hardDay', 'hardDay');
  }
  if (!db.objectStoreNames.contains(STORES.people)) {
    const s = db.createObjectStore(STORES.people, { keyPath: 'id' });
    s.createIndex('name', 'name');
  }
  if (!db.objectStoreNames.contains(STORES.categories)) {
    db.createObjectStore(STORES.categories, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(STORES.attachments)) {
    const s = db.createObjectStore(STORES.attachments, { keyPath: 'id' });
    s.createIndex('ownerId', 'ownerId');
    s.createIndex('memoryId', 'memoryId');
  }
  if (!db.objectStoreNames.contains(STORES.capsules)) {
    const s = db.createObjectStore(STORES.capsules, { keyPath: 'id' });
    s.createIndex('openAt', 'openAt');
  }
  if (!db.objectStoreNames.contains(STORES.settings)) {
    db.createObjectStore(STORES.settings, { keyPath: 'key' });
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
    req.onupgradeneeded = () => upgrade(req.result);
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error ?? new Error('Falha ao abrir o arquivo local.'));
    req.onblocked = () => reject(new Error('O arquivo local está em uso por outra aba.'));
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

/** Escreve em várias stores numa única transação (usado na restauração de backup). */
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
