import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Archive from '../components/Archive';

const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

describe('Archive', () => {
  beforeEach(() => {
    mockOKRData.getArchivedObjectives = () => [
      {
        id: 'arch-1',
        title: 'Archived Objective',
        description: 'Archived desc',
        level: 'company',
        owner: 'Bob',
        startQuarter: 'Q1',
        startYear: 2023,
        endQuarter: 'Q4',
        endYear: 2023,
        progress: 100,
        status: 'completed',
        keyResults: [],
        tags: [],
        createdAt: '',
        updatedAt: '',
        archived: true,
        workspaceId: 'ws-1',
        parentId: undefined,
        quarter: 'Q1',
        year: 2023,
      }
    ];
    mockOKRData.restoreObjective = vi.fn();
    mockOKRData.deleteObjective = vi.fn();
  });

  it('renders archived objectives', () => {
    render(<Archive />);
    expect(screen.getByText('Archived Objective')).toBeInTheDocument();
    expect(screen.getByText('Archived desc')).toBeInTheDocument();
  });

  it('filters archived objectives by search', () => {
    render(<Archive />);
    fireEvent.change(screen.getByPlaceholderText('Search archived objectives...'), { target: { value: 'nonexistent' } });
    expect(screen.queryByText('Archived Objective')).not.toBeInTheDocument();
  });
}); 