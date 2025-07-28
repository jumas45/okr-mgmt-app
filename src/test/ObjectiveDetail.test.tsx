import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ObjectiveDetail from '../components/ObjectiveDetail';

const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

const mockObjective = {
  id: 'obj-1',
  title: 'Detail Objective',
  description: 'Detail desc',
  level: 'company',
  owner: 'Alice',
  startQuarter: 'Q1',
  startYear: 2024,
  endQuarter: 'Q4',
  endYear: 2024,
  progress: 90,
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
};

describe('ObjectiveDetail', () => {
  beforeEach(() => {
    mockOKRData.updateObjective = vi.fn();
    mockOKRData.objectives = [mockObjective];
    mockOKRData.updateTrigger = 0;
    mockOKRData.duplicateObjective = vi.fn();
    mockOKRData.settings = { currentQuarter: 'Q1', currentYear: 2024 };
    mockOKRData.deleteObjective = vi.fn();
    mockOKRData.restoreObjective = vi.fn();
  });

  it('renders objective detail', () => {
    render(<ObjectiveDetail objective={mockObjective} onClose={() => {}} />);
    expect(screen.getByText('Detail Objective')).toBeInTheDocument();
    expect(screen.getByText('Detail desc')).toBeInTheDocument();
  });
}); 