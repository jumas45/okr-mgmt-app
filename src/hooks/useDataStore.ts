import { useLocalStorage } from './useLocalStorage';
import { useSQLiteStorage } from './useSQLiteStorage';

export type StorageType = 'isolated' | 'sqlite';

export function useDataStore<T>(key: string, initialValue: T, storageType: StorageType = 'isolated') {
  if (storageType === 'sqlite') {
    return useSQLiteStorage<T>(key, initialValue);
  }
  // Default: isolated storage
  return useLocalStorage<T>(key, initialValue);
} 