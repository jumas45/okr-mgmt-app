import { useState, useEffect } from 'react';
// @ts-expect-error: sql.js has no types in this project
import initSqlJs from 'sql.js';

// Helper: Save Uint8Array to IndexedDB
function saveToIndexedDB(dbUint8: Uint8Array, key = 'okr-sqlite-db') {
  const request = indexedDB.open('okr-db', 1);
  request.onupgradeneeded = function () {
    request.result.createObjectStore('db');
  };
  request.onsuccess = function () {
    const db = request.result;
    const tx = db.transaction('db', 'readwrite');
    tx.objectStore('db').put(dbUint8, key);
    tx.oncomplete = function () { db.close(); };
  };
}
// Helper: Load Uint8Array from IndexedDB
function loadFromIndexedDB(key = 'okr-sqlite-db'): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open('okr-db', 1);
    request.onupgradeneeded = function () {
      request.result.createObjectStore('db');
    };
    request.onsuccess = function () {
      const db = request.result;
      const tx = db.transaction('db', 'readonly');
      const store = tx.objectStore('db');
      const getReq = store.get(key);
      getReq.onsuccess = function () {
        resolve(getReq.result || null);
        db.close();
      };
      getReq.onerror = function () {
        resolve(null);
        db.close();
      };
    };
    request.onerror = function () { resolve(null); };
  });
}

// This hook provides a similar API to useLocalStorage, but uses a persistent SQLite DB (via sql.js + IndexedDB)
export function useSQLiteStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  // sql.js types are not included by default, so we use 'any' here. TODO: Add proper types if needed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [db, setDb] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const SQL = await initSqlJs({ locateFile: (file: string) => `https://sql.js.org/dist/${file}` });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let db: any;
      const dbFile = await loadFromIndexedDB();
      if (dbFile) {
        db = new SQL.Database(new Uint8Array(dbFile));
      } else {
        db = new SQL.Database();
      }
      // Create a simple key-value table if not exists
      db.run('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');
      // Create advanced tables for OKR data model
      db.run(`CREATE TABLE IF NOT EXISTS objectives (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        level TEXT NOT NULL,
        owner TEXT NOT NULL,
        startQuarter TEXT NOT NULL,
        startYear INTEGER NOT NULL,
        endQuarter TEXT NOT NULL,
        endYear INTEGER NOT NULL,
        progress REAL NOT NULL,
        status TEXT NOT NULL,
        parentId TEXT,
        workspaceId TEXT NOT NULL,
        tags TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        archived INTEGER NOT NULL
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS key_results (
        id TEXT PRIMARY KEY,
        objectiveId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        startValue REAL NOT NULL,
        targetValue REAL NOT NULL,
        currentValue REAL NOT NULL,
        unit TEXT,
        progress REAL NOT NULL,
        status TEXT NOT NULL,
        owner TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        workspaceId TEXT NOT NULL,
        FOREIGN KEY(objectiveId) REFERENCES objectives(id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS check_ins (
        id TEXT PRIMARY KEY,
        keyResultId TEXT NOT NULL,
        value REAL NOT NULL,
        comment TEXT,
        confidence INTEGER,
        date TEXT NOT NULL,
        author TEXT NOT NULL,
        FOREIGN KEY(keyResultId) REFERENCES key_results(id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar TEXT
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        currentQuarter TEXT NOT NULL,
        currentYear INTEGER NOT NULL,
        defaultUserId TEXT,
        FOREIGN KEY(defaultUserId) REFERENCES users(id)
      )`);
      setDb(db);
      // Try to load the value
      const res = db.exec('SELECT value FROM kv WHERE key = ?', [key]);
      if (isMounted) {
        if (res[0] && res[0].values[0]) {
          setStoredValue(JSON.parse(res[0].values[0][0]));
        } else {
          setStoredValue(initialValue);
        }
      }
    })();
    return () => { isMounted = false; };
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    if (!db) return;
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    db.run('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, JSON.stringify(valueToStore)]);
    // Persist DB to IndexedDB
    const dbUint8 = db.export();
    saveToIndexedDB(dbUint8);
  };

  return [storedValue, setValue] as const;
} 