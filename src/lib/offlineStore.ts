import type { KnowledgeNote } from "../types";
import { clearLocalState } from "./localState";

const DB_NAME = "radiology-notes-offline";
const STORE_NAME = "notes";
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineNotes(notes: KnowledgeNote[]) {
  if (!("indexedDB" in window)) return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    notes.forEach((note) => store.put(note));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function readOfflineNotes(): Promise<KnowledgeNote[]> {
  if (!("indexedDB" in window)) return [];
  const database = await openDatabase();
  const notes = await new Promise<KnowledgeNote[]>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as KnowledgeNote[]);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return notes;
}

export async function clearOfflineNotes() {
  clearLocalState();
  if ("indexedDB" in window) {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.includes("radiology") || key.includes("note-images")).map((key) => caches.delete(key)));
  }
}
