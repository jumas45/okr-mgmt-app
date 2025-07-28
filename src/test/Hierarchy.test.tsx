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
    
    // Check that the root objective is rendered
    expect(screen.getAllByRole('button', { name: /Root Objective.*80%/i }).length).toBeGreaterThan(0);
    
    // Check that the expand button is present
    const expandButton = screen.getByRole('button', { name: /Root Objective.*80%/i });
    fireEvent.click(expandButton);
    
    // After expanding, we should see the modal with the objective details
    expect(screen.getAllByText('Root Objective').length).toBeGreaterThan(0);
  });

  it('filters objectives when search is used', () => {
    render(<Hierarchy />);
    
    const searchInput = screen.getByPlaceholderText('Search objectives...');
    fireEvent.change(searchInput, { target: { value: 'Child' } });
    
    // Check that the root objective is still visible (since it contains the child)
    expect(screen.getAllByRole('button', { name: /Root Objective.*80%/i }).length).toBeGreaterThan(0);
    
    // The child objective should be visible after expanding the parent
    const expandButton = screen.getByRole('button', { name: /Root Objective.*80%/i });
    fireEvent.click(expandButton);
    
    // Look for any text containing "Child" in the expanded hierarchy
    expect(screen.getByText((content) => content.includes('Child'))).toBeInTheDocument();
  });
}); 