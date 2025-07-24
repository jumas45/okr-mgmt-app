import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreateKeyResultModal from '../components/CreateKeyResultModal';

const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

describe('CreateKeyResultModal', () => {
  beforeEach(() => {
    mockOKRData.addKeyResult = vi.fn();
    mockOKRData.settings = { defaultUser: { name: 'Alice' } };
    mockOKRData.objectives = [];
  });

  it('renders create key result modal', () => {
    render(<CreateKeyResultModal objectiveId="obj-1" onClose={() => {}} />);
    expect(screen.getByText('Create Key Result')).toBeInTheDocument();
  });
}); 