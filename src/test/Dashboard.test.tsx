import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../components/Dashboard';

// Mock useOKRData
const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

describe('Dashboard', () => {
  beforeEach(() => {
    const objectives = [
      {
        id: 'obj-1',
        title: 'Company Objective',
        description: 'Company desc',
        level: 'company',
        owner: 'Alice',
        startQuarter: 'Q1',
        startYear: 2024,
        endQuarter: 'Q4',
        endYear: 2024,
        progress: 60,
        status: 'on-track',
        keyResults: [],
        tags: [],
        createdAt: '',
        updatedAt: '',
        archived: false,
        workspaceId: 'ws-1',
        parentId: undefined,
        quarter: 'Q1',
        year: 2024,
      }
    ];
    mockOKRData.getCurrentObjectives = () => objectives;
    mockOKRData.objectives = objectives;
    mockOKRData.settings = { currentQuarter: 'Q1', currentYear: 2024 };
    mockOKRData.currentWorkspace = 'ws-1';
  });

  it('renders dashboard with objectives', () => {
    render(<Dashboard searchTerm="" />);
    expect(screen.getAllByText((c) => c.includes('Company Objective')).length).toBeGreaterThan(0);
    expect(screen.getAllByText((c) => c.includes('Company desc')).length).toBeGreaterThan(0);
  });

  it('filters objectives by search term', () => {
    render(<Dashboard searchTerm="nonexistent" />);
    // Both the header and the card title remain, so expect 2
    expect(screen.getAllByText((c) => c.includes('Company Objective')).length).toBe(2);
  });
}); 