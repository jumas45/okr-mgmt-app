import { useState, useEffect } from 'react';
// @ts-expect-error: sql.js has no types in this project
import initSqlJs from 'sql.js';

// Save SQLite database to IndexedDB
function saveToIndexedDB(dbUint8: Uint8Array, key = 'okr-sqlite-db') {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('OKRDatabase', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['databases'], 'readwrite');
      const store = transaction.objectStore('databases');
      const putRequest = store.put(dbUint8, key);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('databases')) {
        db.createObjectStore('databases');
      }
    };
  });
}

// Load SQLite database from IndexedDB
function loadFromIndexedDB(key = 'okr-sqlite-db'): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OKRDatabase', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['databases'], 'readonly');
      const store = transaction.objectStore('databases');
      const getRequest = store.get(key);
      getRequest.onsuccess = () => resolve(getRequest.result || null);
      getRequest.onerror = () => reject(getRequest.error);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('databases')) {
        db.createObjectStore('databases');
      }
    };
  });
}

// Migration function to update existing data to support new status types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateStatusData(db: any) {
  try {
    // Check if we need to migrate status data
    const checkRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='objectives'");
    if (checkRes.length === 0) return; // No objectives table, nothing to migrate

    // Get all objectives with old status values
    const objectivesRes = db.exec('SELECT id, status FROM objectives');
    if (objectivesRes.length === 0) return;

    const objectives = objectivesRes[0];
    let hasChanges = false;

    for (const row of objectives.values) {
      const [id, status] = row;
      // Check if status needs migration (only valid statuses should remain)
      const validStatuses = ['not-started', 'on-track', 'at-risk', 'behind', 'completed', 'on-hold', 'cancelled'];
      if (status && !validStatuses.includes(status)) {
        // Migrate invalid status to 'not-started' as default
        db.run('UPDATE objectives SET status = ? WHERE id = ?', ['not-started', id]);
        hasChanges = true;
      }
    }

    // Also migrate key_results status if needed
    const keyResultsRes = db.exec('SELECT id, status FROM key_results');
    if (keyResultsRes.length > 0) {
      const keyResults = keyResultsRes[0];
      for (const row of keyResults.values) {
        const [id, status] = row;
        const validStatuses = ['not-started', 'on-track', 'at-risk', 'behind', 'completed', 'on-hold', 'cancelled'];
        if (status && !validStatuses.includes(status)) {
          db.run('UPDATE key_results SET status = ? WHERE id = ?', ['not-started', id]);
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      console.log('SQLite: Migrated status data to support new status types');
    }
  } catch (error) {
    console.error('SQLite: Error during status migration:', error);
  }
}

// This hook provides a similar API to useLocalStorage, but uses a persistent SQLite DB (via sql.js + IndexedDB)
export function useSQLiteStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
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
        status TEXT NOT NULL CHECK (status IN ('not-started', 'on-track', 'at-risk', 'behind', 'completed', 'on-hold', 'cancelled')),
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
        status TEXT NOT NULL CHECK (status IN ('not-started', 'on-track', 'at-risk', 'behind', 'completed', 'on-hold', 'cancelled')),
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

      // Run migration for new status types
      migrateStatusData(db);

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
  }, [key, initialValue]);

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