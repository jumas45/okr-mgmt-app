import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { migrateDataStore } from '../hooks/OKRDataContext';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};

// Mock sql.js
const mockSQL = {
  Database: vi.fn(),
};

vi.mock('sql.js', () => ({
  default: vi.fn(() => Promise.resolve(mockSQL)),
}));

describe('SQLite Migration with New Status Types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global objects
    global.indexedDB = mockIndexedDB as any;
    global.localStorage = mockLocalStorage as any;
    
    // Setup mock IndexedDB
    const mockDB = {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => ({
            onsuccess: vi.fn(),
            onerror: vi.fn(),
          })),
          put: vi.fn(() => ({
            onsuccess: vi.fn(),
            onerror: vi.fn(),
          })),
        })),
      })),
      createObjectStore: vi.fn(),
      objectStoreNames: {
        contains: vi.fn(() => false),
      },
    };
    
    mockIndexedDB.open.mockReturnValue({
      onupgradeneeded: vi.fn((callback) => callback({ result: mockDB })),
      onsuccess: vi.fn((callback) => callback({ result: mockDB })),
      onerror: vi.fn(),
    });
    
    // Setup mock SQLite database
    const mockSQLiteDB = {
      run: vi.fn(),
      exec: vi.fn(() => []),
      export: vi.fn(() => new Uint8Array()),
    };
    mockSQL.Database.mockReturnValue(mockSQLiteDB);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should migrate objectives with valid status types', async () => {
    const mockObjectives = [
      {
        id: 'obj-1',
        title: 'Test Objective',
        status: 'on-track',
        keyResults: [
          {
            id: 'kr-1',
            title: 'Test KR',
            status: 'completed',
          },
        ],
      },
      {
        id: 'obj-2',
        title: 'Test Objective 2',
        status: 'on-hold',
        keyResults: [],
      },
    ];

    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'okr-objectives') {
        return JSON.stringify(mockObjectives);
      }
      if (key === 'okr-settings') {
        return JSON.stringify({ currentQuarter: 'Q1', currentYear: 2025 });
      }
      return null;
    });

    await migrateDataStore('to-sqlite');

    // Verify that the migration was called with valid data
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('okr-objectives');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('okr-settings');
  });

  it('should migrate objectives with invalid status types to not-started', async () => {
    const mockObjectives = [
      {
        id: 'obj-1',
        title: 'Test Objective',
        status: 'invalid-status',
        keyResults: [
          {
            id: 'kr-1',
            title: 'Test KR',
            status: 'another-invalid-status',
          },
        ],
      },
    ];

    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'okr-objectives') {
        return JSON.stringify(mockObjectives);
      }
      if (key === 'okr-settings') {
        return JSON.stringify({ currentQuarter: 'Q1', currentYear: 2025 });
      }
      return null;
    });

    // Mock console.log to capture migration messages
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await migrateDataStore('to-sqlite');

    // Verify that migration messages were logged
    expect(consoleSpy).toHaveBeenCalledWith('Migrating invalid objective status: invalid-status -> not-started');
    expect(consoleSpy).toHaveBeenCalledWith('Migrating invalid key result status: another-invalid-status -> not-started');

    consoleSpy.mockRestore();
  });

  it('should handle migration from SQLite to localStorage with status validation', async () => {
    const mockObjectives = [
      {
        id: 'obj-1',
        title: 'Test Objective',
        status: 'cancelled',
        keyResults: [
          {
            id: 'kr-1',
            title: 'Test KR',
            status: 'on-hold',
          },
        ],
      },
    ];

    // Mock SQLite database to return data
    const mockSQLiteDB = {
      run: vi.fn(),
      exec: vi.fn((query: string, params: any[]) => {
        if (query.includes('okr-objectives')) {
          return [{ values: [[JSON.stringify(mockObjectives)]] }];
        }
        if (query.includes('okr-settings')) {
          return [{ values: [['{"currentQuarter":"Q1","currentYear":2025}']] }];
        }
        return [];
      }),
      export: vi.fn(() => new Uint8Array()),
    };
    mockSQL.Database.mockReturnValue(mockSQLiteDB);

    await migrateDataStore('to-isolated');

    // Verify that localStorage was updated with validated data
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('okr-objectives', expect.any(String));
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('okr-settings', expect.any(String));
  });
}); 