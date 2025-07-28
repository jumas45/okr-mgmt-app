import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(() => true),
});

// Mock window.isEditing
Object.defineProperty(window, 'isEditing', {
  writable: true,
  value: false,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock IndexedDB
const indexedDBMock = {
  open: vi.fn(),
};
Object.defineProperty(window, 'indexedDB', {
  value: indexedDBMock,
});