import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Analytics from '../components/Analytics';

const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

describe('Analytics', () => {
  beforeEach(() => {
    mockOKRData.getCurrentObjectives = () => [
      {
        id: 'obj-1',
        title: 'Objective 1',
        description: 'Desc 1',
        level: 'company',
        owner: 'Alice',
        startQuarter: 'Q1',
        startYear: 2024,
        endQuarter: 'Q4',
        endYear: 2024,
        progress: 100,
        status: 'completed',
        keyResults: [{ id: 'kr-1', title: 'KR1', type: 'number', startValue: 0, targetValue: 100, currentValue: 100, progress: 100, status: 'completed', owner: 'Alice', checkIns: [], createdAt: '', updatedAt: '', workspaceId: 'ws-1' }],
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
    mockOKRData.getArchivedObjectives = () => [];
    mockOKRData.settings = { currentQuarter: 'Q1', currentYear: 2024 };
  });

  it('renders analytics dashboard and metrics', () => {
    render(<Analytics />);
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Active Objectives')).toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getByText('Key Results')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // metric count
  });
}); 