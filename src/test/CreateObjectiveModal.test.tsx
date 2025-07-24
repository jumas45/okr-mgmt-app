import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreateObjectiveModal from '../components/CreateObjectiveModal';

const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

describe('CreateObjectiveModal', () => {
  beforeEach(() => {
    mockOKRData.addObjective = vi.fn();
    mockOKRData.settings = { defaultUser: { name: 'Alice' } };
    mockOKRData.objectives = [];
    mockOKRData.currentWorkspace = 'ws-1';
  });

  it('renders create objective modal', () => {
    render(<CreateObjectiveModal onClose={() => {}} />);
    expect(screen.getByText('Create Objective')).toBeInTheDocument();
  });
}); 