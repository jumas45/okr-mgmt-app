import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ObjectiveCard from '../components/ObjectiveCard';
import { Objective } from '../types';

// Module-scoped mock object for useOKRData
const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

const mockObjective: Objective = {
  id: 'test-obj-1',
  title: 'Test Objective',
  description: 'Test Description',
  level: 'individual',
  owner: 'John Doe',
  quarter: 'Q1',
  year: 2025,
  startQuarter: 'Q1',
  startYear: 2025,
  endQuarter: 'Q4',
  endYear: 2025,
  progress: 50,
  status: 'on-track',
  keyResults: [
    {
      id: 'kr-1',
      title: 'Test Key Result',
      type: 'number',
      startValue: 0,
      targetValue: 100,
      currentValue: 50,
      progress: 50,
      status: 'on-track',
      owner: 'John Doe',
      checkIns: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      workspaceId: 'workspace-1',
    }
  ],
  tags: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  archived: false,
  workspaceId: 'workspace-1',
};

describe('ObjectiveCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock implementation
    mockOKRData.objectives = [mockObjective];
    mockOKRData.updateTrigger = 0;
    mockOKRData.deleteObjective = vi.fn();
    mockOKRData.archiveObjective = vi.fn();
    mockOKRData.updateObjective = vi.fn();
    mockOKRData.settings = { currentQuarter: 'Q1', currentYear: 2025 };
  });

  it('renders objective card with correct data', () => {
    render(<ObjectiveCard objective={mockObjective} />);
    
    expect(screen.getByText('Test Objective')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    // Use more specific selector for the overall progress percentage
    expect(screen.getByText('50%', { selector: '.text-sm.font-bold' })).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('opens detail modal when card is clicked', async () => {
    const user = userEvent.setup();
    render(<ObjectiveCard objective={mockObjective} />);
    
    const card = screen.getByText('Test Objective').closest('div');
    await user.click(card!);
    
    await waitFor(() => {
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    });
  });

  it('opens detail modal when View Details is clicked', async () => {
    const user = userEvent.setup();
    render(<ObjectiveCard objective={mockObjective} />);
    
    const viewDetailsButton = screen.getByText('View Details');
    await user.click(viewDetailsButton);
    
    await waitFor(() => {
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    });
  });

  it('does not open modal when menu button is clicked', async () => {
    const user = userEvent.setup();
    render(<ObjectiveCard objective={mockObjective} />);
    
    const menuButton = screen.getByRole('button', { name: 'Show objective options menu' });
    await user.click(menuButton);
    
    // Should show menu, not modal
    expect(screen.queryByText('Overall Progress')).not.toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('reflects real-time updates from global state', () => {
    const { rerender } = render(<ObjectiveCard objective={mockObjective} />);
    
    // Simulate state change
    const updatedObjective = { ...mockObjective, progress: 75, title: 'Updated Title' };
    
    // Mock the hook to return updated data
    mockOKRData.objectives = [updatedObjective];
    mockOKRData.updateTrigger = 1;
    mockOKRData.deleteObjective = vi.fn();
    mockOKRData.archiveObjective = vi.fn();
    mockOKRData.updateObjective = vi.fn();
    
    rerender(<ObjectiveCard objective={mockObjective} />);
    
    expect(screen.getByText('Updated Title')).toBeInTheDocument();
    expect(screen.getByText('75%', { selector: '.text-sm.font-bold' })).toBeInTheDocument();
  });
});