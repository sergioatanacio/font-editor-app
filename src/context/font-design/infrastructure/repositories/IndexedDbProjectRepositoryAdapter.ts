import type { ProjectRepository, TypefaceProjectSnapshot } from "../../domain/ports";

const DB_NAME = "font-design-db";
const DB_VERSION = 1;
const STORE_NAME = "projects";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "projectId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    action(store, resolve, reject);
    tx.onerror = () => reject(tx.error);
  });
}

export class IndexedDbProjectRepositoryAdapter implements ProjectRepository {
  async save(project: TypefaceProjectSnapshot): Promise<void> {
    const db = await openDb();
    await runTransaction<void>(db, "readwrite", (store, resolve, reject) => {
      const request = store.put(project);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  }

  async load(projectId: string): Promise<TypefaceProjectSnapshot | null> {
    const db = await openDb();
    const result = await runTransaction<TypefaceProjectSnapshot | null>(db, "readonly", (store, resolve, reject) => {
      const request = store.get(projectId);
      request.onsuccess = () => resolve((request.result as TypefaceProjectSnapshot | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result;
  }

  async delete(projectId: string): Promise<void> {
    const db = await openDb();
    await runTransaction<void>(db, "readwrite", (store, resolve, reject) => {
      const request = store.delete(projectId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  }
}
