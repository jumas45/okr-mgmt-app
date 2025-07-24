import React, { useState } from 'react';
import { useOKRData } from '../hooks/useOKRData';
import ObjectiveDetail from './ObjectiveDetail';
import type { Objective } from '../types';
import { ChevronDown, ChevronRight, Building2, Users2, User } from 'lucide-react';

// Helper: recursively check if an objective or any of its descendants match the search
function matchesSearchOrDescendant(obj: Objective, objectives: Objective[], search: string): boolean {
  if (obj.title.toLowerCase().includes(search.toLowerCase())) return true;
  const children = objectives.filter(child => child.parentId === obj.id);
  return children.some(child => matchesSearchOrDescendant(child, objectives, search));
}

// Level background color mapping
const levelBg: Record<string, string> = {
  company: 'bg-blue-50',
  team: 'bg-green-50',
  individual: 'bg-purple-50',
};

// Level icon mapping
const levelIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  company: { icon: <Building2 className="w-4 h-4" />, color: 'text-blue-600' },
  team: { icon: <Users2 className="w-4 h-4" />, color: 'text-green-600' },
  individual: { icon: <User className="w-4 h-4" />, color: 'text-purple-600' },
};

function renderTree(objectives: Objective[], parentId: string | undefined, search: string, onSelect: (obj: Objective) => void, expanded: Record<string, boolean>, setExpanded: (id: string) => void) {
  return objectives
    .filter(obj => obj.parentId === parentId)
    .filter(obj => search === '' || matchesSearchOrDescendant(obj, objectives, search))
    .map(obj => {
      const hasChildren = objectives.some(child => child.parentId === obj.id);
      // Auto-expand for search, but never override user toggles
      let isExpanded = !!expanded[obj.id];
      if (search && hasChildren && objectives.filter(child => child.parentId === obj.id).some(child => matchesSearchOrDescendant(child, objectives, search))) {
        isExpanded = true;
      }
      const progressColor =
        obj.progress === 0 ? 'text-gray-400' :
        obj.progress >= 70 ? 'text-green-600' :
        obj.progress >= 40 ? 'text-amber-600' :
        'text-red-600';
      return (
        <div key={obj.id} className={`ml-4 mt-2 rounded ${levelBg[obj.level] || ''}`}
          >
          <div
            className="flex items-center space-x-2 py-1 px-2 rounded cursor-pointer select-none hover:bg-blue-100"
            onClick={e => {
              // Only toggle expand/collapse if not clicking the title
              if (!(e.target as HTMLElement).closest('.okr-title-btn')) {
                setExpanded(obj.id);
              }
            }}
          >
            {hasChildren && (
              <span className="w-7 h-7 flex items-center justify-center">
                {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
              </span>
            )}
            <button
              className="okr-title-btn text-left text-blue-700 hover:underline text-sm font-medium"
              onClick={e => { e.stopPropagation(); onSelect(obj); }}
            >
              <span className={`inline-flex items-center justify-center mr-1 align-middle ${levelIcons[obj.level]?.color || ''}`}>
                {levelIcons[obj.level]?.icon}
              </span>
              {obj.title}
              <span className={`ml-2 text-xs font-bold ${progressColor}`}>{obj.progress}%</span>
            </button>
            {/* Tags as pills */}
            {obj.tags && obj.tags.length > 0 && (
              <span className="flex flex-wrap gap-1 ml-2">
                {obj.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
                    {tag}
                  </span>
                ))}
              </span>
            )}
            <span className="text-xs text-gray-500 ml-2">{obj.owner}</span>
          </div>
          {hasChildren && isExpanded && (
            <div className="ml-4 border-l border-gray-200 pl-2">
              {renderTree(objectives, obj.id, search, onSelect, expanded, setExpanded)}
            </div>
          )}
        </div>
      );
    });
}

export default function Hierarchy() {
  const { getCurrentObjectives } = useOKRData();
  const objectives = getCurrentObjectives();
  const [search, setSearch] = useState('');
  const [detailObjective, setDetailObjective] = useState<Objective | null>(null);
  const [expanded, setExpandedState] = useState<Record<string, boolean>>({});

  const setExpanded = (id: string) => {
    setExpandedState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // (No auto-reset of expanded state)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">OKR Hierarchy</h2>
      <input
        type="text"
        placeholder="Search objectives..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <div>
        {renderTree(objectives, undefined, search, setDetailObjective, expanded, setExpanded)}
      </div>
      {detailObjective && (
        <ObjectiveDetail objective={detailObjective} onClose={() => setDetailObjective(null)} />
      )}
    </div>
  );
} 