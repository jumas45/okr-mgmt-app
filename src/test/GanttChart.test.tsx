import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GanttChart from '../components/GanttChart';

const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

describe('GanttChart', () => {
  beforeEach(() => {
    mockOKRData.objectives = [
      {
        id: 'obj-1',
        title: 'Gantt Objective',
        description: 'Gantt desc',
        level: 'company',
        owner: 'Alice',
        startQuarter: 'Q1',
        startYear: 2024,
        endQuarter: 'Q4',
        endYear: 2024,
        progress: 50,
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
    mockOKRData.currentWorkspace = 'ws-1';
  });

  it('renders gantt chart with objectives', () => {
    render(<GanttChart />);
    expect(screen.getAllByText((content) => content.includes('Gantt Objective')).length).toBeGreaterThan(0);
  });

  it('filters objectives by search', () => {
    render(<GanttChart />);
    fireEvent.change(screen.getByPlaceholderText('Search objectives...'), { target: { value: 'nonexistent' } });
    expect(screen.queryByText((content) => content.includes('Gantt Objective'))).not.toBeInTheDocument();
  });
}); 