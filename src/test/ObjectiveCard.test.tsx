import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mock } from 'vitest';
import ObjectiveCard from '../components/ObjectiveCard';
import { Objective } from '../types';

// Mock the useOKRData hook with a proper mock function
const mockUseOKRData = vi.fn();
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: mockUseOKRData
}));

const mockUpdateObjective = vi.fn();
const mockDeleteObjective = vi.fn();
const mockArchiveObjective = vi.fn();

const mockObjective: Objective = {
  id: 'test-obj-1',
  title: 'Test Objective',
  description: 'Test Description',
  level: 'individual',
  owner: 'John Doe',
  quarter: 'Q1',
  year: 2025,
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
      updatedAt: '2025-01-01T00:00:00.000Z'
    }
  ],
  tags: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  archived: false
};

describe('ObjectiveCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementation
    mockUseOKRData.mockReturnValue({
      objectives: [mockObjective],
      updateTrigger: 0,
      deleteObjective: mockDeleteObjective,
      archiveObjective: mockArchiveObjective,
      updateObjective: mockUpdateObjective,
    });
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
    
    const menuButton = screen.getByRole('button', { name: 'Objective options' });
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
    mockUseOKRData.mockReturnValue({
      objectives: [updatedObjective],
      updateTrigger: 1,
      deleteObjective: mockDeleteObjective,
      archiveObjective: mockArchiveObjective,
      updateObjective: mockUpdateObjective,
    });
    
    rerender(<ObjectiveCard objective={mockObjective} />);
    
    expect(screen.getByText('Updated Title')).toBeInTheDocument();
    expect(screen.getByText('75%', { selector: '.text-sm.font-bold' })).toBeInTheDocument();
  });
});