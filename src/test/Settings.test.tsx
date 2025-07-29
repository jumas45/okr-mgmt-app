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
      defaultUser: { name: 'Test User', email: 'test@example.com', role: 'Tester' }
    };
    mockOKRData.workspaces = ['ws-1'];
    mockOKRData.currentWorkspace = 'ws-1';
    mockOKRData.objectives = [];
    mockOKRData.addWorkspace = vi.fn();
    mockOKRData.switchWorkspace = vi.fn();
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

  it('renders workspace management section', () => {
    render(<Settings />);
    expect(screen.getByText('Manage Workspaces')).toBeInTheDocument();
    expect(screen.getByText('Add New Workspace')).toBeInTheDocument();
  });

  it('renders data management section', () => {
    render(<Settings />);
    expect(screen.getByText('Data Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset all data/i })).toBeInTheDocument();
  });

  it('renders statistics section', () => {
    render(<Settings />);
    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('Total Objectives')).toBeInTheDocument();
    expect(screen.getByText('Total Key Results')).toBeInTheDocument();
  });
}); 