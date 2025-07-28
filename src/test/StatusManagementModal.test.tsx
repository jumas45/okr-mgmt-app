import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatusManagementModal from '../components/StatusManagementModal';
import { Objective } from '../types';
import { OKRDataProvider } from '../hooks/OKRDataContext';

// Mock the useOKRData hook
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => ({
    updateObjective: vi.fn(),
    objectives: [],
  }),
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
  keyResults: [],
  tags: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  archived: false,
  workspaceId: 'workspace-1',
};

describe('StatusManagementModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the modal with current status', () => {
    render(
      <OKRDataProvider>
        <StatusManagementModal objective={mockObjective} onClose={mockOnClose} />
      </OKRDataProvider>
    );

    expect(screen.getByText('Manage Status')).toBeInTheDocument();
    expect(screen.getByText('Current Status:')).toBeInTheDocument();
    expect(screen.getByText('On Track')).toBeInTheDocument();
  });

  it('should show available status actions for on-track objective', () => {
    render(
      <OKRDataProvider>
        <StatusManagementModal objective={mockObjective} onClose={mockOnClose} />
      </OKRDataProvider>
    );

    expect(screen.getByText('Put on Hold')).toBeInTheDocument();
    expect(screen.getByText('Cancel Objective')).toBeInTheDocument();
  });

  it('should show available status actions for on-hold objective', () => {
    const onHoldObjective = { ...mockObjective, status: 'on-hold' as const };
    
    render(
      <OKRDataProvider>
        <StatusManagementModal objective={onHoldObjective} onClose={mockOnClose} />
      </OKRDataProvider>
    );

    expect(screen.getByText('Resume from Hold')).toBeInTheDocument();
    expect(screen.getByText('Cancel Objective')).toBeInTheDocument();
  });

  it('should show available status actions for cancelled objective', () => {
    const cancelledObjective = { ...mockObjective, status: 'cancelled' as const };
    
    render(
      <OKRDataProvider>
        <StatusManagementModal objective={cancelledObjective} onClose={mockOnClose} />
      </OKRDataProvider>
    );

    expect(screen.getByText('Resurrect Objective')).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <StatusManagementModal
        objective={mockObjective}
        isOpen={true}
        onClose={onClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('should show confirmation modal when status action is clicked', () => {
    render(
      <OKRDataProvider>
        <StatusManagementModal objective={mockObjective} onClose={mockOnClose} />
      </OKRDataProvider>
    );

    const putOnHoldButton = screen.getByText('Put on Hold');
    fireEvent.click(putOnHoldButton);

    expect(screen.getByText('Confirm Status Change')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to put "Test Objective"/)).toBeInTheDocument();
  });
}); 