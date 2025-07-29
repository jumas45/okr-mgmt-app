import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../components/Header';

const mockOKRData: Record<string, unknown> = {};
vi.mock('../hooks/useOKRData', () => ({
  useOKRData: () => mockOKRData
}));

describe('Header', () => {
  const mockProps = {
    currentView: 'dashboard',
    onViewChange: vi.fn(),
    currentQuarter: 'Q1',
    currentYear: 2024,
    onQuarterYearChange: vi.fn(),
    darkMode: false,
    setDarkMode: vi.fn(),
  };

  beforeEach(() => {
    mockOKRData.workspaces = ['Test Workspace'];
    mockOKRData.currentWorkspace = 'Test Workspace';
    mockOKRData.switchWorkspace = vi.fn();
  });

  it('renders header with navigation items', () => {
    render(<Header {...mockProps} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('OKR List')).toBeInTheDocument();
  });

  it('renders profile icon', () => {
    render(<Header {...mockProps} />);
    expect(screen.getByLabelText('Profile menu')).toBeInTheDocument();
  });

  it('opens profile menu when clicked', () => {
    render(<Header {...mockProps} />);
    const profileButton = screen.getByLabelText('Profile menu');
    fireEvent.click(profileButton);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('navigates to settings when settings button is clicked', () => {
    render(<Header {...mockProps} />);
    const profileButton = screen.getByLabelText('Profile menu');
    fireEvent.click(profileButton);
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    expect(mockProps.onViewChange).toHaveBeenCalledWith('settings');
  });

  it('navigates to archive when archive button is clicked', () => {
    render(<Header {...mockProps} />);
    const profileButton = screen.getByLabelText('Profile menu');
    fireEvent.click(profileButton);
    const archiveButton = screen.getByText('Archive');
    fireEvent.click(archiveButton);
    expect(mockProps.onViewChange).toHaveBeenCalledWith('archive');
  });

  it('toggles dark mode when dark mode button is clicked', () => {
    render(<Header {...mockProps} />);
    const profileButton = screen.getByLabelText('Profile menu');
    fireEvent.click(profileButton);
    const darkModeButton = screen.getByText('Dark Mode');
    fireEvent.click(darkModeButton);
    expect(mockProps.setDarkMode).toHaveBeenCalled();
  });
}); 