import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Hierarchy from '../components/Hierarchy';

const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

describe('Hierarchy', () => {
  beforeEach(() => {
    const objectives = [
      {
        id: 'obj-1',
        title: 'Root Objective',
        description: 'Root desc',
        level: 'company',
        owner: 'Alice',
        startQuarter: 'Q1',
        startYear: 2024,
        endQuarter: 'Q4',
        endYear: 2024,
        progress: 80,
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
      },
      {
        id: 'obj-2',
        title: 'Child Objective',
        description: 'Child desc',
        level: 'team',
        owner: 'Bob',
        startQuarter: 'Q1',
        startYear: 2024,
        endQuarter: 'Q4',
        endYear: 2024,
        progress: 60,
        status: 'at-risk',
        keyResults: [],
        tags: [],
        createdAt: '',
        updatedAt: '',
        archived: false,
        workspaceId: 'ws-1',
        parentId: 'obj-1',
        quarter: 'Q1',
        year: 2024,
      }
    ];
    mockOKRData.getCurrentObjectives = () => objectives;
    mockOKRData.objectives = objectives;
    mockOKRData.settings = { currentQuarter: 'Q1', currentYear: 2024 };
  });

  it('renders hierarchy with objectives', () => {
    render(<Hierarchy />);
    // Expand the root node to reveal the child
    const expandButton = screen.getByRole('button', { name: /Root Objective.*80%/i });
    fireEvent.click(expandButton);
    expect(screen.getAllByRole('button', { name: /Root Objective.*80%/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Child Objective/i }).length).toBeGreaterThan(0);
  });

  it('filters objectives by search', () => {
    render(<Hierarchy />);
    fireEvent.change(screen.getByPlaceholderText('Search objectives...'), { target: { value: 'Child' } });
    expect(screen.getAllByRole('button', { name: /Child Objective/i }).length).toBeGreaterThan(0);
    // Only the header for Root Objective should remain
    expect(screen.getAllByRole('button', { name: /Root Objective.*80%/i }).length).toBe(1);
  });
}); 