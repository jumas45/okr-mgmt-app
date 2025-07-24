import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import Archive from './components/Archive';
import Settings from './components/Settings';
import Hierarchy from './components/Hierarchy';
import GanttChart from './components/GanttChart';
import { useOKRData } from './hooks/useOKRData';
import type { OKRSettings } from './types';
import { Toaster } from 'react-hot-toast';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const { settings, setSettings } = useOKRData();
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('okr-dark-mode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('okr-dark-mode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  const handleQuarterYearChange = (quarter: string, year: number) => {
    setSettings((prev: OKRSettings) => ({ ...prev, currentQuarter: quarter as OKRSettings['currentQuarter'], currentYear: year }));
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'analytics':
        return <Analytics />;
      case 'archive':
        return <Archive />;
      case 'settings':
        return <Settings />;
      case 'hierarchy':
        return <Hierarchy />;
      case 'gantt':
        return <GanttChart />;
      default:
        return <Dashboard searchTerm={searchTerm} onSearch={setSearchTerm} />;
    }
  };

  return (
    <div className={"min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300"}>
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        currentQuarter={settings.currentQuarter}
        currentYear={settings.currentYear}
        onQuarterYearChange={handleQuarterYearChange}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      <main>
        {renderCurrentView()}
      </main>
      <Toaster position="top-right" toastOptions={{ duration: 3500, style: { borderRadius: '10px', background: '#fff', color: '#333', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' } }} />
      <div aria-live="polite" className="sr-only" id="toast-aria-live"></div>
    </div>
  );
}

export default App;