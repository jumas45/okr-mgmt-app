import React, { useState } from 'react';
import { Save, Download, Upload, RotateCcw, Copy } from 'lucide-react';
import { useOKRData } from '../hooks/useOKRData';
import { migrateDataStore } from '../hooks/OKRDataContext';
import { Quarter } from '../types';
import { exportOKRData, importOKRData } from '../utils/calculations';

export default function Settings() {
  const { settings, setSettings, objectives, workspaces, currentWorkspace, addWorkspace, switchWorkspace } = useOKRData();
  const [formData, setFormData] = useState(settings);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = () => {
    try {
      setSettings(formData);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleExport = () => {
    try {
      const data = exportOKRData(objectives);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `okr-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage('Data exported successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setMessage('Error exporting data. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleImport = () => {
    if (!importFile) return;
    
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const importedData = importOKRData(result);
        console.log('Imported data:', importedData);
        setMessage('Data imported successfully! Please refresh the page to see changes.');
        setTimeout(() => setMessage(''), 5000);
        setImportFile(null);
      } catch (error) {
        console.error('Error importing data:', error);
        setMessage('Error importing data. Please check the file format.');
        setTimeout(() => setMessage(''), 3000);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setMessage('Error reading file. Please try again.');
      setTimeout(() => setMessage(''), 3000);
      setIsLoading(false);
    };
    reader.readAsText(importFile);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      try {
        localStorage.clear();
        window.location.reload();
      } catch (error) {
        console.error('Error resetting data:', error);
        setMessage('Error resetting data. Please try again.');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  const currentYear = new Date().getFullYear();
  const [years, setYears] = useState(Array.from({ length: 5 }, (_, i) => currentYear + i - 2));
  const [newYear, setNewYear] = useState<number | ''>('');

  const handleAddYear = () => {
    if (typeof newYear === 'number' && !years.includes(newYear)) {
      setYears(prev => [...prev, newYear].sort((a, b) => a - b));
      setNewYear('');
    }
  };

  // Tenant management
  const [newWorkspace, setNewWorkspace] = useState('');
  const [renamingWorkspace, setRenamingWorkspace] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Add delete, rename, and clone logic
  const deleteWorkspace = (name: string) => {
    if (name === currentWorkspace) {
      setMessage('Cannot delete the current workspace. Please switch to another workspace first.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      const newWorkspaces = workspaces.filter(w => w !== name);
      localStorage.setItem('okr-workspaces', JSON.stringify(newWorkspaces));
      window.location.reload(); // force reload to clear data for deleted workspace
    } catch (error) {
      console.error('Error deleting workspace:', error);
      setMessage('Error deleting workspace. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const renameWorkspace = (oldName: string, newName: string) => {
    if (!newName.trim() || workspaces.includes(newName.trim())) {
      setMessage('Workspace name already exists or is invalid.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      const newWorkspaces = workspaces.map(w => (w === oldName ? newName.trim() : w));
      localStorage.setItem('okr-workspaces', JSON.stringify(newWorkspaces));
      // Migrate all objectives for this workspace
      const okrs: import('../types').Objective[] = JSON.parse(localStorage.getItem('okr-objectives') || '[]');
      okrs.forEach(obj => {
        if (obj.workspaceId === oldName) {
          obj.workspaceId = newName.trim();
        }
      });
      localStorage.setItem('okr-objectives', JSON.stringify(okrs));
      window.location.reload();
    } catch (error) {
      console.error('Error renaming workspace:', error);
      setMessage('Error renaming workspace. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Helper to generate a new unique ID (simple random string)
  function generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Clone workspace and all its data
  const cloneWorkspace = (source: string, newName: string) => {
    if (!newName.trim() || workspaces.includes(newName.trim())) {
      setMessage('Workspace name already exists or is invalid.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      // Clone objectives for the source workspace
      const okrs: import('../types').Objective[] = JSON.parse(localStorage.getItem('okr-objectives') || '[]');
      // Deep clone objectives and key results, assign new IDs, and set workspaceId
      const clonedObjectives = okrs
        .filter(obj => obj.workspaceId === source)
        .map(obj => {
          const newObjId = generateId();
          // Map old key result IDs to new ones
          const krIdMap: Record<string, string> = {};
          const clonedKRs = obj.keyResults.map(kr => {
            const newKrId = generateId();
            krIdMap[kr.id] = newKrId;
            return {
              ...kr,
              id: newKrId,
              workspaceId: newName.trim(),
              checkIns: kr.checkIns.map(ci => ({ ...ci, id: generateId() })),
            };
          });
          // If parentId is in the same workspace, remap it
          let newParentId = undefined;
          if (obj.parentId) {
            const parentObj = okrs.find(o => o.id === obj.parentId && o.workspaceId === source);
            if (parentObj) {
              // We'll remap after all IDs are known
              newParentId = parentObj.id;
            }
          }
          return {
            ...obj,
            id: newObjId,
            workspaceId: newName.trim(),
            keyResults: clonedKRs,
            parentId: newParentId,
          };
        });
      // Remap parentIds in cloned objectives
      const oldToNewId: Record<string, string> = {};
      okrs.filter(obj => obj.workspaceId === source).forEach((obj, i) => {
        oldToNewId[obj.id] = clonedObjectives[i].id;
      });
      clonedObjectives.forEach(obj => {
        if (obj.parentId && oldToNewId[obj.parentId]) {
          obj.parentId = oldToNewId[obj.parentId];
        }
      });
      // Add new workspace to list
      const newWorkspaces = [...workspaces, newName.trim()];
      localStorage.setItem('okr-workspaces', JSON.stringify(newWorkspaces));
      // Add cloned objectives to storage
      const allObjectives = okrs.concat(clonedObjectives);
      localStorage.setItem('okr-objectives', JSON.stringify(allObjectives));
      setMessage('Workspace cloned successfully!');
      setTimeout(() => setMessage(''), 3000);
      window.location.reload();
    } catch (error) {
      console.error('Error cloning workspace:', error);
      setMessage('Error cloning workspace. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Storage type setting
  const [storageType, setStorageType] = useState(() => localStorage.getItem('okr-storage-type') || 'isolated');
  const handleStorageTypeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    if (newType === storageType) return;
    
    setIsLoading(true);
    setMessage('Migrating data, please wait...');
    
    try {
      setStorageType(newType);
      localStorage.setItem('okr-storage-type', newType);
      
      if (newType === 'sqlite') {
        await migrateDataStore('to-sqlite');
        setMessage('Data migrated to SQLite. Reloading...');
      } else {
        await migrateDataStore('to-isolated');
        setMessage('Data migrated to Isolated Storage. Reloading...');
      }
      setTimeout(() => { window.location.reload(); }, 1200);
    } catch (error) {
      console.error('Error migrating data:', error);
      setMessage('Error migrating data. Please try again.');
      setTimeout(() => setMessage(''), 3000);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your OKR app preferences and manage your data
        </p>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200">{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
            <Save className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            General Settings
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Quarter
                </label>
                <select
                  value={formData.currentQuarter}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentQuarter: e.target.value as Quarter }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                >
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Year
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.currentYear}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentYear: Number(e.target.value) }))}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1900}
                    max={3000}
                    value={newYear}
                    onChange={e => setNewYear(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Add"
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 w-16 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddYear}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={newYear === '' || years.includes(Number(newYear))}
                    title="Add new year option"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Default User Profile</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.defaultUser.name}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      defaultUser: { ...prev.defaultUser, name: e.target.value }
                    }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.defaultUser.email}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      defaultUser: { ...prev.defaultUser, email: e.target.value }
                    }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    value={formData.defaultUser.role}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      defaultUser: { ...prev.defaultUser, role: e.target.value }
                    }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data Storage Type</label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                value={storageType}
                onChange={handleStorageTypeChange}
                disabled={isLoading}
              >
                <option value="isolated">Isolated Storage (default)</option>
                <option value="sqlite">SQLite (experimental)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose your preferred data storage method. SQLite migration requires page reload.</p>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Management */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Workspace Management
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Workspace</label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <span className="text-lg font-medium text-purple-800 dark:text-purple-200">{currentWorkspace}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add New Workspace</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWorkspace}
                  onChange={e => setNewWorkspace(e.target.value)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Workspace name"
                />
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={() => { 
                    if (newWorkspace.trim()) { 
                      try {
                        addWorkspace(newWorkspace.trim()); 
                        setNewWorkspace(''); 
                      } catch (error) {
                        console.error('Error adding workspace:', error);
                        setMessage('Error adding workspace. Please try again.');
                        setTimeout(() => setMessage(''), 3000);
                      }
                    } 
                  }}
                  disabled={!newWorkspace.trim() || workspaces.includes(newWorkspace.trim())}
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">All Workspaces</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {workspaces.map(w => (
                  <div key={w} className={`p-3 rounded-lg border transition-colors ${w === currentWorkspace 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}>
                    {renamingWorkspace === w ? (
                      <div className="flex gap-2">
                        <input
                          className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 dark:text-white"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          autoFocus
                        />
                        <button 
                          className="text-xs text-green-600 dark:text-green-400 hover:underline px-2 py-1 rounded bg-green-100 dark:bg-green-900/30" 
                          onClick={() => { renameWorkspace(w, renameValue); setRenamingWorkspace(null); }}
                        >
                          Save
                        </button>
                        <button 
                          className="text-xs text-gray-500 dark:text-gray-400 hover:underline px-2 py-1 rounded bg-gray-100 dark:bg-gray-700" 
                          onClick={() => setRenamingWorkspace(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${w === currentWorkspace ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                          {w} {w === currentWorkspace && <span className="text-xs text-blue-600 dark:text-blue-400">(current)</span>}
                        </span>
                        {w !== currentWorkspace && (
                          <div className="flex gap-1">
                            <button 
                              className="text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-2 py-1 rounded transition-colors" 
                              onClick={() => {
                                try {
                                  switchWorkspace(w);
                                } catch (error) {
                                  console.error('Error switching workspace:', error);
                                  setMessage('Error switching workspace. Please try again.');
                                  setTimeout(() => setMessage(''), 3000);
                                }
                              }}
                            >
                              Switch
                            </button>
                            <button 
                              className="text-xs text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 px-2 py-1 rounded transition-colors" 
                              onClick={() => { setRenamingWorkspace(w); setRenameValue(w); }}
                            >
                              Rename
                            </button>
                            <button 
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 px-2 py-1 rounded transition-colors flex items-center gap-1" 
                              onClick={() => {
                                const newName = window.prompt('Enter a name for the cloned workspace:');
                                if (newName) cloneWorkspace(w, newName);
                              }}
                            >
                              <Copy className="w-3 h-3" /> Clone
                            </button>
                            <button 
                              className="text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 px-2 py-1 rounded transition-colors" 
                              onClick={() => { if (window.confirm('Delete this workspace and all its data?')) deleteWorkspace(w); }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
            <Download className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
            Data Management
          </h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Export Data</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                Download all your OKR data as a JSON file for backup or sharing.
              </p>
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </button>
            </div>

            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Import Data</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                Upload a previously exported JSON file to restore your OKR data.
              </p>
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
                  disabled={isLoading}
                />
                <button
                  onClick={handleImport}
                  disabled={!importFile || isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import Data</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Reset All Data</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                Clear all OKR data and settings. This action cannot be undone.
              </p>
              <button
                onClick={handleReset}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset All Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Statistics
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{objectives.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Objectives</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {objectives.reduce((sum, obj) => sum + obj.keyResults.length, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Key Results</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {objectives.filter(obj => obj.archived).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Archived</div>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {objectives.filter(obj => obj.progress === 100).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}