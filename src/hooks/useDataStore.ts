import { useLocalStorage } from './useLocalStorage';
import { useSQLiteStorage } from './useSQLiteStorage';

export type StorageType = 'isolated' | 'sqlite';

export function useDataStore<T>(key: string, initialValue: T, storageType: StorageType = 'isolated') {
  // Always call both hooks to maintain hook order
  const localStorageHook = useLocalStorage(key, initialValue);
  const sqliteHook = useSQLiteStorage(key, initialValue);
  
  // Return the appropriate hook based on storage type
  return storageType === 'sqlite' ? sqliteHook : localStorageHook;
} 