import React, { createContext, useContext, useState, useCallback } from 'react';
import { useDataStore, StorageType } from './useDataStore';
import { Objective, KeyResult, CheckIn, OKRSettings, User, Quarter } from '../types';
import { calculateObjectiveStatus } from '../utils/calculations';
// Migration helper: copy all data between stores (no React hooks)
// Uses direct localStorage and sql.js for SQLite
// @ts-expect-error: sql.js has no types in this project
import initSqlJs from 'sql.js';

const defaultUser: User = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'Product Manager',
  avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
};

const defaultSettings: OKRSettings = {
  currentQuarter: 'Q1',
  currentYear: new Date().getFullYear(),
  defaultUser
};

interface OKRDataContextType {
  objectives: Objective[];
  updateTrigger: number;
  settings: OKRSettings;
  setSettings: React.Dispatch<React.SetStateAction<OKRSettings>>;
  addObjective: (objective: Omit<Objective, 'id' | 'createdAt' | 'updatedAt' | 'progress'>) => Objective;
  updateObjective: (id: string, updates: Partial<Objective>) => void;
  deleteObjective: (id: string) => void;
  addKeyResult: (objectiveId: string, keyResult: Omit<KeyResult, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'checkIns'>) => void;
  updateKeyResult: (objectiveId: string, keyResultId: string, updates: Partial<KeyResult>) => void;
  addCheckIn: (objectiveId: string, keyResultId: string, checkIn: Omit<CheckIn, 'id'>) => void;
  getCurrentObjectives: () => Objective[];
  getArchivedObjectives: () => Objective[];
  archiveObjective: (id: string) => void;
  restoreObjective: (id: string) => void;
  duplicateObjective: (id: string, targetQuarter: string, targetYear: number) => Objective | undefined;
  workspaces: string[];
  currentWorkspace: string;
  addWorkspace: (name: string) => void;
  switchWorkspace: (name: string) => void;
  listWorkspaces: () => string[];
}

const OKRDataContext = createContext<OKRDataContextType | undefined>(undefined);

export async function migrateDataStore(direction: 'to-sqlite' | 'to-isolated') {
  // Migrate objectives
  const lsObjectives = JSON.parse(localStorage.getItem('okr-objectives') || '[]');
  const lsSettings = JSON.parse(localStorage.getItem('okr-settings') || '{}');

  // Open SQLite DB from IndexedDB
  function loadFromIndexedDB(key = 'okr-sqlite-db'): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('okr-db', 1);
      request.onupgradeneeded = function () {
        request.result.createObjectStore('db');
      };
      request.onsuccess = function () {
        const db = request.result;
        const tx = db.transaction('db', 'readonly');
        const store = tx.objectStore('db');
        const getReq = store.get(key);
        getReq.onsuccess = function () {
          resolve(getReq.result || null);
          db.close();
        };
        getReq.onerror = function () {
          resolve(null);
          db.close();
        };
      };
      request.onerror = function () { resolve(null); };
    });
  }
  function saveToIndexedDB(dbUint8: Uint8Array, key = 'okr-sqlite-db') {
    const request = indexedDB.open('okr-db', 1);
    request.onupgradeneeded = function () {
      request.result.createObjectStore('db');
    };
    request.onsuccess = function () {
      const db = request.result;
      const tx = db.transaction('db', 'readwrite');
      tx.objectStore('db').put(dbUint8, key);
      tx.oncomplete = function () { db.close(); };
    };
  }

  const SQL = await initSqlJs({ locateFile: (file: string) => `https://sql.js.org/dist/${file}` });
  const dbFile = await loadFromIndexedDB();
  let db;
  if (dbFile) {
    db = new SQL.Database(new Uint8Array(dbFile));
  } else {
    db = new SQL.Database();
  }
  db.run('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)');

  if (direction === 'to-sqlite') {
    db.run('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', ['okr-objectives', JSON.stringify(lsObjectives)]);
    db.run('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', ['okr-settings', JSON.stringify(lsSettings)]);
    const dbUint8 = db.export();
    saveToIndexedDB(dbUint8);
  } else {
    // Copy from SQLite to localStorage
    const resObj = db.exec('SELECT value FROM kv WHERE key = ?', ['okr-objectives']);
    const resSettings = db.exec('SELECT value FROM kv WHERE key = ?', ['okr-settings']);
    if (resObj[0] && resObj[0].values[0]) {
      localStorage.setItem('okr-objectives', resObj[0].values[0][0]);
    }
    if (resSettings[0] && resSettings[0].values[0]) {
      localStorage.setItem('okr-settings', resSettings[0].values[0][0]);
    }
  }
}

export function OKRDataProvider({ children }: { children: React.ReactNode }) {
  // Workspace management helpers
  const WORKSPACE_STORAGE_KEY = 'okr-workspaces';
  function getInitialWorkspaces(): string[] {
    const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    return ['Juma Test'];
  }
  function saveWorkspaces(workspaces: string[]) {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaces));
  }

  // Workspace state
  const [workspaces, setWorkspaces] = React.useState<string[]>(getInitialWorkspaces());
  const [currentWorkspace, setCurrentWorkspace] = React.useState<string>(workspaces[0]);

  // Workspace management functions
  const addWorkspace = (name: string) => {
    if (!workspaces.includes(name)) {
      const newWorkspaces = [...workspaces, name];
      setWorkspaces(newWorkspaces);
      saveWorkspaces(newWorkspaces);
    }
  };
  const switchWorkspace = (name: string) => {
    if (workspaces.includes(name)) setCurrentWorkspace(name);
  };
  const listWorkspaces = () => workspaces;

  // Persist workspaces to localStorage
  React.useEffect(() => { saveWorkspaces(workspaces); }, [workspaces]);

  // Data migration: ensure all objectives and key results have workspaceId, and migrate tenantId to workspaceId
  const migrateObjectives = (objs: Objective[]): Objective[] => {
    return objs.map((obj) => {
      // Migrate key results
      const migratedKRs: KeyResult[] = (obj.keyResults || []).map((kr) => {
        // Prefer workspaceId, then tenantId, then fallback
        const workspaceId = (kr as KeyResult).workspaceId || (kr as unknown as { tenantId?: string }).tenantId || obj.workspaceId || (obj as unknown as { tenantId?: string }).tenantId || 'Juma Test';
        // Remove tenantId if present (for type safety, create a new object)
        const restKr = kr as unknown as Omit<KeyResult, 'tenantId'>;
        return {
          ...restKr,
          workspaceId,
        } as KeyResult;
      });
      const workspaceId = obj.workspaceId || (obj as unknown as { tenantId?: string }).tenantId || 'Juma Test';
      // Remove tenantId if present (for type safety, create a new object)
      const restObj = obj as unknown as Omit<Objective, 'tenantId'>;
      return {
        ...restObj,
        workspaceId,
        keyResults: migratedKRs,
      } as Objective;
    });
  };
  // Use storage type from settings (default: isolated)
  const storageType = (localStorage.getItem('okr-storage-type') as StorageType) || 'isolated';
  const [objectives, setObjectives] = useDataStore<Objective[]>('okr-objectives', [], storageType);
  // Apply migration on load
  React.useEffect(() => {
    setObjectives(prev => migrateObjectives(prev));
    // eslint-disable-next-line
  }, []);
  const [settings, setSettings] = useDataStore<OKRSettings>('okr-settings', defaultSettings, storageType);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const triggerUpdate = useCallback(() => {
    setUpdateTrigger(prev => prev + 1);
  }, []);

  function getRolledUpProgress(objective: Objective, allObjectives: Objective[]): number {
    const children = allObjectives.filter(child => child.parentId === objective.id);
    const keyResults = objective.keyResults || [];
    const childProgresses = children.map(child => getRolledUpProgress(child, allObjectives));
    const krProgresses = keyResults.map(kr => kr.progress);
    const allProgresses = [...childProgresses, ...krProgresses];
    if (allProgresses.length > 0) {
      return Math.round(allProgresses.reduce((sum, p) => sum + p, 0) / allProgresses.length);
    }
    return 0;
  }

  function getObjectivesWithRollup(objs: Objective[]): Objective[] {
    return objs.map(obj => ({
      ...obj,
      progress: getRolledUpProgress(obj, objs),
    }));
  }

  // Helper: recursively roll up progress to all parents
  function rollupProgressToParents(childObjectiveId: string, allObjectives?: Objective[]): Objective[] {
    const objs = allObjectives || objectives;
    const child = objs.find(obj => obj.id === childObjectiveId);
    if (!child || !child.parentId) return objs;
    const parent = objs.find(obj => obj.id === child.parentId);
    if (!parent) return objs;
    // Recalculate parent's progress as average of its children's progress
    const children = objs.filter(obj => obj.parentId === parent.id);
    const newProgress = children.length > 0 ? Math.round(children.reduce((sum, c) => sum + c.progress, 0) / children.length) : 0;
    const updatedObjs = objs.map(obj =>
      obj.id === parent.id
        ? {
            ...obj,
            progress: newProgress,
            status: calculateObjectiveStatus(newProgress),
            updatedAt: new Date().toISOString()
          }
        : obj
    );
    // Recurse up the tree
    return rollupProgressToParents(parent.id, updatedObjs);
  }

  const addObjective = (objective: Omit<Objective, 'id' | 'createdAt' | 'updatedAt' | 'progress'>) => {
    const newObjective: Objective = {
      ...objective,
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setObjectives(prev => [...prev, newObjective]);
    triggerUpdate();
    return newObjective;
  };

  const updateObjective = (id: string, updates: Partial<Objective>) => {
    setObjectives(prev => {
      const updated = prev.map(obj =>
        obj.id === id 
          ? { 
              ...obj, 
              ...updates, 
              updatedAt: new Date().toISOString(),
              status: updates.progress !== undefined ? calculateObjectiveStatus(updates.progress) : obj.status
            }
          : obj
      );
      return rollupProgressToParents(id, updated);
    });
    triggerUpdate();
  };

  const deleteObjective = (id: string) => {
    setObjectives(prev => prev.filter(obj => obj.id !== id));
    triggerUpdate();
  };

  const addKeyResult = (objectiveId: string, keyResult: Omit<KeyResult, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'checkIns'>) => {
    const newKeyResult: KeyResult = {
      ...keyResult,
      id: `kr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      progress: keyResult.type === 'boolean' ? (keyResult.currentValue === keyResult.targetValue ? 100 : 0) : 
                Math.min(100, Math.max(0, ((keyResult.currentValue - keyResult.startValue) / (keyResult.targetValue - keyResult.startValue)) * 100)),
      checkIns: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setObjectives(prev => {
      const updated = prev.map(obj => {
        if (obj.id === objectiveId) {
          const updatedKeyResults = [...obj.keyResults, newKeyResult];
          const progress = updatedKeyResults.length > 0 
            ? updatedKeyResults.reduce((sum, kr) => sum + kr.progress, 0) / updatedKeyResults.length
            : 0;
          return {
            ...obj,
            keyResults: updatedKeyResults,
            progress: Math.round(progress),
            status: calculateObjectiveStatus(Math.round(progress)),
            updatedAt: new Date().toISOString()
          };
        }
        return obj;
      });
      return rollupProgressToParents(objectiveId, updated);
    });
    triggerUpdate();
  };

  const updateKeyResult = (objectiveId: string, keyResultId: string, updates: Partial<KeyResult>) => {
    setObjectives(prev => {
      const updated = prev.map(obj => {
        if (obj.id === objectiveId) {
          const updatedKeyResults = obj.keyResults.map(kr => {
            if (kr.id === keyResultId) {
              const updatedKR = { ...kr, ...updates, updatedAt: new Date().toISOString() };
              if (updates.currentValue !== undefined) {
                updatedKR.progress = kr.type === 'boolean' 
                  ? (updatedKR.currentValue === updatedKR.targetValue ? 100 : 0)
                  : Math.min(100, Math.max(0, ((updatedKR.currentValue - updatedKR.startValue) / (updatedKR.targetValue - updatedKR.startValue)) * 100));
              }
              return updatedKR;
            }
            return kr;
          });
          
          const progress = updatedKeyResults.length > 0 
            ? updatedKeyResults.reduce((sum, kr) => sum + kr.progress, 0) / updatedKeyResults.length
            : 0;
          
          return {
            ...obj,
            keyResults: updatedKeyResults,
            progress: Math.round(progress),
            status: calculateObjectiveStatus(Math.round(progress)),
            updatedAt: new Date().toISOString()
          };
        }
        return obj;
      });
      return rollupProgressToParents(objectiveId, updated);
    });
    triggerUpdate();
  };

  const addCheckIn = (objectiveId: string, keyResultId: string, checkIn: Omit<CheckIn, 'id'>) => {
    const newCheckIn: CheckIn = {
      ...checkIn,
      id: `ci-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    updateKeyResult(objectiveId, keyResultId, {
      checkIns: [...(objectives.find(o => o.id === objectiveId)?.keyResults.find(kr => kr.id === keyResultId)?.checkIns || []), newCheckIn],
      currentValue: checkIn.value
    });
    triggerUpdate();
  };

  const getCurrentObjectives = () => {
    // Helper to compare (year, quarter) tuples
    function isAfterOrEqual(y1: number, q1: Quarter, y2: number, q2: Quarter) {
      if (y1 > y2) return true;
      if (y1 === y2) return ['Q1','Q2','Q3','Q4'].indexOf(q1) >= ['Q1','Q2','Q3','Q4'].indexOf(q2);
      return false;
    }
    function isBeforeOrEqual(y1: number, q1: Quarter, y2: number, q2: Quarter) {
      if (y1 < y2) return true;
      if (y1 === y2) return ['Q1','Q2','Q3','Q4'].indexOf(q1) <= ['Q1','Q2','Q3','Q4'].indexOf(q2);
      return false;
    }
    // Show objectives if the current quarter/year falls within their span (inclusive) and match current workspace
    const filtered = objectives.filter(obj =>
      obj.workspaceId === currentWorkspace &&
      !obj.archived &&
      isAfterOrEqual(settings.currentYear, settings.currentQuarter as Quarter, obj.startYear, obj.startQuarter) &&
      isBeforeOrEqual(settings.currentYear, settings.currentQuarter as Quarter, obj.endYear, obj.endQuarter)
    );
    return getObjectivesWithRollup(filtered);
  };

  const getArchivedObjectives = () => {
    const filtered = objectives.filter(obj => obj.archived);
    return getObjectivesWithRollup(filtered);
  };

  const archiveObjective = (id: string) => {
    updateObjective(id, { archived: true });
  };

  const restoreObjective = (id: string) => {
    updateObjective(id, { archived: false });
    triggerUpdate();
  };

  // Duplicate an objective (and its key results) to a different quarter/year
  const duplicateObjective = (id: string, targetQuarter: string, targetYear: number) => {
    const obj = objectives.find(o => o.id === id);
    if (!obj) return;
    // Copy key results with new ids
    const newKeyResults = obj.keyResults.map(kr => ({
      ...kr,
      id: `kr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
      checkIns: [],
    }));
    // Create new objective (no parent/child linkage)
    const newObjective: Objective = {
      ...obj,
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `COPIED: ${obj.title}`,
      description: (obj.description || '') + `\n- Duplicated from [${obj.title}]`,
      quarter: targetQuarter as Quarter,
      year: targetYear,
      keyResults: newKeyResults,
      parentId: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
      archived: false,
    };
    setObjectives(prev => [...prev, newObjective]);
    triggerUpdate();
    return newObjective;
  };

  return (
    <OKRDataContext.Provider value={{
      objectives: getObjectivesWithRollup(objectives),
      updateTrigger,
      settings,
      setSettings,
      addObjective,
      updateObjective,
      deleteObjective,
      addKeyResult,
      updateKeyResult,
      addCheckIn,
      getCurrentObjectives,
      getArchivedObjectives,
      archiveObjective,
      restoreObjective,
      duplicateObjective,
      workspaces,
      currentWorkspace,
      addWorkspace,
      switchWorkspace,
      listWorkspaces,
    }}>
      {children}
    </OKRDataContext.Provider>
  );
}

export function useOKRDataContext() {
  const ctx = useContext(OKRDataContext);
  if (!ctx) throw new Error('useOKRDataContext must be used within an OKRDataProvider');
  return ctx;
} 