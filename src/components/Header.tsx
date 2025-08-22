import React from 'react';
import { LayoutDashboard, BarChart3, Archive, Settings, List, Sun, Moon } from 'lucide-react';
import OkrLogo from '../assets/okr-logo.png';
import { useOKRData } from '../hooks/useOKRData';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
  currentQuarter: string;
  currentYear: number;
  onQuarterYearChange?: (quarter: string, year: number) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean | ((d: boolean) => boolean)) => void;
}

// Add a TypeScript declaration for window.isEditing
declare global {
  interface Window {
    isEditing?: boolean;
  }
}

export default function Header({ currentView, onViewChange, currentQuarter, currentYear, onQuarterYearChange, darkMode, setDarkMode }: HeaderProps) {
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gantt', label: 'Timeline', icon: List },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'okr-list', label: 'OKR List', icon: List }, // Move this to the end, remove Hierarchy
  ];

  const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);
  const { workspaces, currentWorkspace, switchWorkspace } = useOKRData();

  // Helper: check for global edit state (window.isEditing) and warn if needed
  const handleHomeClick = () => {
    // If a global flag is set, show warning
    if (window.isEditing) {
      if (!window.confirm('You have unsaved changes. Refreshing will discard them. Continue?')) {
        return;
      }
    }
    window.location.reload();
  };

  // Close settings menu on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('.relative')) {
        setShowSettingsMenu(false);
      }
    }
    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClick);
    } else {
      document.removeEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettingsMenu]);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <a href="#main-content" className="sr-only focus:not-sr-only absolute left-2 top-2 bg-blue-600 text-white px-3 py-1 rounded z-50">Skip to main content</a>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo and Nav */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <button
                className="flex items-center space-x-3 focus:outline-none"
                onClick={handleHomeClick}
                title="Go to Home (refresh)"
                aria-label="Go to Home (refresh)"
              >
                <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-transparent">
                  <img src={OkrLogo} alt="OKR Manager Logo" className="w-16 h-16" />
                </div>
              </button>
            </div>
            
            <nav className="flex space-x-6">
              {navigationItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === item.id
                        ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Right: Workspace, Quarter/Year, User */}
          <div className="flex items-center space-x-4 ml-8">
            {/* Workspace Switcher Group */}
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Workspace</span>
              <select
                value={currentWorkspace}
                onChange={e => switchWorkspace(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 dark:text-white"
                style={{ minWidth: 120 }}
              >
                {workspaces.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            {/* Quarter/Year Picker Group */}
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Period</span>
              <select
                value={currentQuarter}
                onChange={e => onQuarterYearChange && onQuarterYearChange(e.target.value, currentYear)}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
              <span className="text-gray-400 dark:text-gray-500 mx-1">-</span>
              <select
                value={currentYear}
                onChange={e => onQuarterYearChange && onQuarterYearChange(currentQuarter, Number(e.target.value))}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
            {/* Profile Icon with Settings Dropdown */}
            <div className="relative">
              <button
                className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center focus:outline-none"
                onClick={() => setShowSettingsMenu(v => !v)}
                aria-label="Profile menu"
                aria-haspopup="menu"
                aria-expanded={showSettingsMenu}
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">JD</span>
              </button>
              {showSettingsMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50">
                  <button
                    onClick={() => { 
                      try {
                        setShowSettingsMenu(false); 
                        onViewChange('settings'); 
                      } catch (error) {
                        console.error('Error navigating to settings:', error);
                        setShowSettingsMenu(false);
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-gray-200"
                  >
                    <Settings className="w-4 h-4" aria-hidden="true" /> Settings
                  </button>
                  <button
                    onClick={() => { 
                      try {
                        setShowSettingsMenu(false); 
                        onViewChange('archive'); 
                      } catch (error) {
                        console.error('Error navigating to archive:', error);
                        setShowSettingsMenu(false);
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-gray-200"
                  >
                    <Archive className="w-4 h-4" aria-hidden="true" /> Archive
                  </button>
                  <button
                    onClick={() => {
                      try {
                        setDarkMode(d => !d);
                      } catch (error) {
                        console.error('Error toggling dark mode:', error);
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-gray-200"
                    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {darkMode ? <Sun className="w-4 h-4 text-yellow-400" aria-hidden="true" /> : <Moon className="w-4 h-4 text-gray-700 dark:text-gray-200" aria-hidden="true" />}
                    <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}