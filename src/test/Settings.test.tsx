import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settings from '../components/Settings';

const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

describe('Settings', () => {
  beforeEach(() => {
    mockOKRData.settings = { currentQuarter: 'Q1', currentYear: 2024, defaultUser: { name: 'Alice' } };
    mockOKRData.setSettings = vi.fn();
    mockOKRData.objectives = [];
    mockOKRData.workspaces = ['ws-1'];
    mockOKRData.currentWorkspace = 'ws-1';
    mockOKRData.addWorkspace = vi.fn();
    mockOKRData.switchWorkspace = vi.fn();
  });

  it('renders settings form', () => {
    render(<Settings />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls setSettings when Save is clicked', () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(mockOKRData.setSettings).toHaveBeenCalled();
  });
}); 