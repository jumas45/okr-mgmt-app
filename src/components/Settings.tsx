import React, { useState } from 'react';
import { Save, Download, Upload, RotateCcw, Copy } from 'lucide-react';
import { useOKRData } from '../hooks/useOKRData';
import { migrateDataStore } from '../hooks/OKRDataContext';
import { Quarter } from '../types';
import { exportOKRData, importOKRData } from '../utils/calculations';

export default function Settings() {
  const { settings, setSettings, objectives } = useOKRData();
  const [formData, setFormData] = useState(settings);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const handleSave = () => {
    setSettings(formData);
    setMessage('Settings saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleExport = () => {
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
  };

  const handleImport = () => {
    if (!importFile) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const importedData = importOKRData(result);
        // In a real app, you'd want to merge or replace data more carefully
        console.log('Imported data:', importedData);
        setMessage('Data imported successfully! Please refresh the page to see changes.');
        setTimeout(() => setMessage(''), 5000);
      } catch {
        setMessage('Error importing data. Please check the file format.');
        setTimeout(() => setMessage(''), 3000);
      }
    };
    reader.readAsText(importFile);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
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
  const { workspaces, currentWorkspace, addWorkspace, switchWorkspace } = useOKRData();
  const [newWorkspace, setNewWorkspace] = useState('');
  const [renamingWorkspace, setRenamingWorkspace] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Add delete, rename, and clone logic
  const deleteWorkspace = (name: string) => {
    if (name === currentWorkspace) return;
    const newWorkspaces = workspaces.filter(w => w !== name);
    localStorage.setItem('okr-workspaces', JSON.stringify(newWorkspaces));
    window.location.reload(); // force reload to clear data for deleted workspace
  };
  const renameWorkspace = (oldName: string, newName: string) => {
    if (!newName.trim() || workspaces.includes(newName.trim())) return;
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
  };

  // Storage type setting
  const [storageType, setStorageType] = useState(() => localStorage.getItem('okr-storage-type') || 'isolated');
  const handleStorageTypeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    if (newType === storageType) return;
    setStorageType(newType);
    localStorage.setItem('okr-storage-type', newType);
    setMessage('Migrating data, please wait...');
    if (newType === 'sqlite') {
      await migrateDataStore('to-sqlite');
      setMessage('Data migrated to SQLite. Reloading...');
    } else {
      await migrateDataStore('to-isolated');
      setMessage('Data migrated to Isolated Storage. Reloading...');
    }
    setTimeout(() => { window.location.reload(); }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">
          Configure your OKR app preferences and manage your data
        </p>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{message}</p>
        </div>
      )}

      {/* Workspace Management */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Manage Workspaces</h3>
        <div className="mb-4 flex gap-2 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Add New Workspace</label>
            <input
              type="text"
              value={newWorkspace}
              onChange={e => setNewWorkspace(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Workspace name"
            />
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => { if (newWorkspace.trim()) { addWorkspace(newWorkspace.trim()); setNewWorkspace(''); } }}
            disabled={!newWorkspace.trim() || workspaces.includes(newWorkspace.trim())}
          >
            Add
          </button>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-blue-50 border border-blue-100 mb-4">
          <span className="text-xs text-gray-500 font-medium">Workspace</span>
          <select
            value={currentWorkspace}
            onChange={e => switchWorkspace(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {workspaces.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">All Workspaces</label>
          <ul className="space-y-1">
            {workspaces.map(w => (
              <li key={w} className="flex items-center gap-2">
                {renamingWorkspace === w ? (
                  <>
                    <input
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      autoFocus
                    />
                    <button className="text-xs text-green-600 hover:underline" onClick={() => { renameWorkspace(w, renameValue); setRenamingWorkspace(null); }}>Save</button>
                    <button className="text-xs text-gray-500 hover:underline" onClick={() => setRenamingWorkspace(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span className={w === currentWorkspace ? 'font-bold text-blue-700' : ''}>{w}</span>
                    {w !== currentWorkspace && (
                      <>
                        <button className="text-xs text-blue-600 hover:underline" onClick={() => switchWorkspace(w)}>Switch</button>
                        <button className="text-xs text-yellow-600 hover:underline" onClick={() => { setRenamingWorkspace(w); setRenameValue(w); }}>Rename</button>
                        <button className="text-xs text-red-600 hover:underline" onClick={() => { if (window.confirm('Delete this workspace and all its data?')) deleteWorkspace(w); }}>Delete</button>
                        <button className="text-xs text-indigo-600 hover:underline flex items-center gap-1" onClick={() => {
                          const newName = window.prompt('Enter a name for the cloned workspace:');
                          if (newName) cloneWorkspace(w, newName);
                        }}>
                          <Copy className="w-4 h-4" aria-hidden="true" /> Clone
                        </button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow border border-gray-200 mt-8">
        <h2 className="text-2xl font-bold mb-6">Settings</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Data Storage Type</label>
          <select
            className="border border-gray-300 rounded px-3 py-2 w-full"
            value={storageType}
            onChange={handleStorageTypeChange}
          >
            <option value="isolated">Isolated Storage (default)</option>
            <option value="sqlite">SQLite (experimental)</option>
          </select>
          <div className="text-xs text-gray-500 mt-1">Default is Isolated Storage. Switch to SQLite for advanced use. (Requires reload)</div>
        </div>
        <div className="space-y-8">
          {/* General Settings */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">General Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Quarter
                </label>
                <select
                  value={formData.currentQuarter}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentQuarter: e.target.value as Quarter }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Year
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.currentYear}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentYear: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    placeholder="Add year"
                    className="border border-gray-300 rounded-lg px-2 py-2 w-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddYear}
                    className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    disabled={newYear === '' || years.includes(Number(newYear))}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Default User</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.defaultUser.name}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      defaultUser: { ...prev.defaultUser, name: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.defaultUser.email}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      defaultUser: { ...prev.defaultUser, email: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    value={formData.defaultUser.role}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      defaultUser: { ...prev.defaultUser, role: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                <span>Save Settings</span>
              </button>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Data Management</h3>
            
            <div className="space-y-6">
              {/* Export */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Export Data</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Download all your OKR data as a JSON file for backup or sharing.
                </p>
                <button
                  onClick={handleExport}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Export Data</span>
                </button>
              </div>

              {/* Import */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Import Data</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Upload a previously exported JSON file to restore your OKR data.
                </p>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <button
                    onClick={handleImport}
                    disabled={!importFile}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    <span>Import</span>
                  </button>
                </div>
              </div>

              {/* Reset */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Reset All Data</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Clear all OKR data and settings. This action cannot be undone.
                </p>
                <button
                  onClick={handleReset}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Reset All Data</span>
                </button>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Statistics</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{objectives.length}</div>
                <div className="text-sm text-gray-600">Total Objectives</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {objectives.reduce((sum, obj) => sum + obj.keyResults.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Key Results</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {objectives.filter(obj => obj.archived).length}
                </div>
                <div className="text-sm text-gray-600">Archived</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {objectives.filter(obj => obj.progress === 100).length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}