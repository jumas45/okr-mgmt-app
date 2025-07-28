import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Settings from '../components/Settings';

const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

describe('Settings', () => {
  beforeEach(() => {
    mockOKRData.setSettings = vi.fn();
    mockOKRData.settings = { 
      currentQuarter: 'Q1', 
      currentYear: 2024,
      defaultUser: { name: 'Test User' }
    };
    mockOKRData.workspaces = ['ws-1'];
    mockOKRData.currentWorkspace = 'ws-1';
    mockOKRData.objectives = [];
  });

  it('renders settings form', () => {
    render(<Settings />);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls setSettings when Save is clicked', () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(mockOKRData.setSettings).toHaveBeenCalled();
  });
}); 