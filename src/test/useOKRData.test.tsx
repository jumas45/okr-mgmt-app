import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOKRData } from '../hooks/useOKRData';
import { OKRDataProvider } from '../hooks/OKRDataContext';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function customRenderHook(callback) {
  return renderHook(callback, {
    wrapper: ({ children }) => <OKRDataProvider>{children}</OKRDataProvider>,
  });
}

describe('useOKRData', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
  });

  it('should add objective and trigger update', () => {
    const { result } = customRenderHook(() => useOKRData());
    const initialTrigger = result.current.updateTrigger;

    act(() => {
      result.current.addObjective({
        title: 'Test Objective',
        description: 'Test Description',
        level: 'individual',
        owner: 'John Doe',
        quarter: 'Q1',
        year: 2025,
        status: 'not-started',
        keyResults: [],
        tags: [],
        archived: false
      });
    });

    expect(result.current.objectives).toHaveLength(1);
    expect(result.current.objectives[0].title).toBe('Test Objective');
    expect(result.current.updateTrigger).toBe(initialTrigger + 1);
  });

  it('should update objective and trigger update', () => {
    const { result } = customRenderHook(() => useOKRData());

    // First add an objective
    act(() => {
      result.current.addObjective({
        title: 'Test Objective',
        description: 'Test Description',
        level: 'individual',
        owner: 'John Doe',
        quarter: 'Q1',
        year: 2025,
        status: 'not-started',
        keyResults: [],
        tags: [],
        archived: false
      });
    });

    const objectiveId = result.current.objectives[0].id;
    const triggerBeforeUpdate = result.current.updateTrigger;

    // Add a key result so progress can be updated
    act(() => {
      result.current.addKeyResult(objectiveId, {
        title: 'Test Key Result',
        type: 'number',
        startValue: 0,
        targetValue: 100,
        currentValue: 75,
        owner: 'John Doe',
        status: 'on-track'
      });
    });

    // Then update it
    act(() => {
      result.current.updateObjective(objectiveId, {
        title: 'Updated Objective',
        progress: 75
      });
    });

    expect(result.current.objectives[0].title).toBe('Updated Objective');
    expect(result.current.objectives[0].progress).toBe(75);
    expect(result.current.objectives[0].status).toBe('on-track');
    expect(result.current.updateTrigger).toBe(triggerBeforeUpdate + 2);
  });

  it('should add key result and update objective progress', () => {
    const { result } = customRenderHook(() => useOKRData());

    // Add objective first
    act(() => {
      result.current.addObjective({
        title: 'Test Objective',
        level: 'individual',
        owner: 'John Doe',
        quarter: 'Q1',
        year: 2025,
        status: 'not-started',
        keyResults: [],
        tags: [],
        archived: false
      });
    });

    const objectiveId = result.current.objectives[0].id;

    // Add key result
    act(() => {
      result.current.addKeyResult(objectiveId, {
        title: 'Test Key Result',
        type: 'number',
        startValue: 0,
        targetValue: 100,
        currentValue: 50,
        owner: 'John Doe',
        status: 'on-track'
      });
    });

    const updatedObjective = result.current.objectives[0];
    expect(updatedObjective.keyResults).toHaveLength(1);
    expect(updatedObjective.keyResults[0].progress).toBe(50);
    expect(updatedObjective.progress).toBe(50);
    expect(updatedObjective.status).toBe('at-risk');
  });

  it('should update key result and recalculate objective progress', () => {
    const { result } = customRenderHook(() => useOKRData());

    // Setup objective with key result
    act(() => {
      result.current.addObjective({
        title: 'Test Objective',
        level: 'individual',
        owner: 'John Doe',
        quarter: 'Q1',
        year: 2025,
        status: 'not-started',
        keyResults: [],
        tags: [],
        archived: false
      });
    });

    const objectiveId = result.current.objectives[0].id;

    act(() => {
      result.current.addKeyResult(objectiveId, {
        title: 'Test Key Result',
        type: 'number',
        startValue: 0,
        targetValue: 100,
        currentValue: 50,
        owner: 'John Doe',
        status: 'on-track'
      });
    });

    const keyResultId = result.current.objectives[0].keyResults[0].id;

    // Update key result
    act(() => {
      result.current.updateKeyResult(objectiveId, keyResultId, {
        currentValue: 80
      });
    });

    const updatedObjective = result.current.objectives[0];
    expect(updatedObjective.keyResults[0].currentValue).toBe(80);
    expect(updatedObjective.keyResults[0].progress).toBe(80);
    expect(updatedObjective.progress).toBe(80);
    expect(updatedObjective.status).toBe('on-track');
  });
});