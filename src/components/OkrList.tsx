import React, { useState } from 'react';
import { useOKRData } from '../hooks/useOKRData';
import { User, Users2, Building2, ArrowUp, ArrowDown, Search, ChevronDown, ChevronRight } from 'lucide-react';
import type { Objective } from '../types';
import ObjectiveDetail from './ObjectiveDetail';

const levelIcons: Record<string, React.ReactNode> = {
  company: <Building2 className="w-4 h-4 text-blue-600" />,
  team: <Users2 className="w-4 h-4 text-green-600" />,
  individual: <User className="w-4 h-4 text-purple-600" />,
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${value}%`, background: value === 100 ? '#22c55e' : '#3b82f6' }} />
    </div>
  );
}

function getSortValue(obj: Objective, key: string) {
  switch (key) {
    case 'progress': return obj.progress;
    case 'owner': return obj.owner.toLowerCase();
    case 'title': return obj.title.toLowerCase();
    case 'level': return obj.level;
    case 'timeline': return `${obj.startYear}${obj.startQuarter}`;
    case 'due': return `${obj.endYear}${obj.endQuarter}`;
    case 'tags': return (obj.tags && obj.tags.length > 0 ? obj.tags.join(',').toLowerCase() : '');
    default: return '';
  }
}

// Helper: recursively check if an objective or any of its descendants match the search
function matchesSearchOrDescendant(obj: Objective, objectives: Objective[], search: string): boolean {
  if (
    obj.title.toLowerCase().includes(search) ||
    obj.owner.toLowerCase().includes(search) ||
    (obj.tags && obj.tags.join(',').toLowerCase().includes(search)) ||
    (obj.keyResults && obj.keyResults.some(kr =>
      kr.title.toLowerCase().includes(search) ||
      kr.owner.toLowerCase().includes(search)
    ))
  ) return true;
  const children = objectives.filter(child => child.parentId === obj.id);
  return children.some(child => matchesSearchOrDescendant(child, objectives, search));
}

// Helper: for a search, return all matching objectives and their parents
function getHierarchyFilteredObjectives(objs: Objective[], search: string): Objective[] {
  if (!search) return objs;
  // Find all matching objectives (by title, owner, tags)
  const matches = new Set<string>();
  objs.forEach(obj => {
    if (matchesSearchOrDescendant(obj, objs, search)) matches.add(obj.id);
  });
  // For each match, add all its parents
  const result = new Set<string>();
  function addWithParents(id: string) {
    if (result.has(id)) return;
    result.add(id);
    const obj = objs.find(o => o.id === id);
    if (obj && obj.parentId) addWithParents(obj.parentId);
  }
  matches.forEach(addWithParents);
  return objs.filter(obj => result.has(obj.id));
}

// Helper: build a tree of objectives by parentId
function buildObjectiveTree(objs: Objective[]): (Objective & { children?: Objective[] })[] {
  const idToNode: Record<string, Objective & { children?: Objective[] }> = {};
  objs.forEach(obj => { idToNode[obj.id] = { ...obj, children: [] }; });
  const roots: (Objective & { children?: Objective[] })[] = [];
  objs.forEach(obj => {
    if (obj.parentId && idToNode[obj.parentId]) {
      idToNode[obj.parentId].children!.push(idToNode[obj.id]);
    } else {
      roots.push(idToNode[obj.id]);
    }
  });
  return roots;
}

export default function OkrList() {
  const { getCurrentObjectives } = useOKRData();
  const objectives = getCurrentObjectives();
  const [sortKey, setSortKey] = useState<string>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [detailObjective, setDetailObjective] = useState<Objective | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const searchLower = search.toLowerCase();
  const filtered = getHierarchyFilteredObjectives(objectives, searchLower);
  const sorted = [...filtered].sort((a, b) => {
    const va = getSortValue(a, sortKey);
    const vb = getSortValue(b, sortKey);
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Render tree recursively
  function renderObjectiveRow(obj: Objective & { children?: Objective[] }, depth = 0): React.ReactNode[] {
    const hasChildren = obj.children && obj.children.length > 0;
    const isExpanded = expanded[obj.id] !== false;
    return [
      <tr
        key={obj.id}
        className={
          `border-b transition ` +
          (obj.level === 'company' ? 'bg-blue-50 hover:bg-blue-100' :
           obj.level === 'team' ? 'bg-green-50 hover:bg-green-100' :
           'bg-purple-50 hover:bg-purple-100')
        }
        onClick={e => {
          if (!(e.target as HTMLElement).closest('button')) {
            setDetailObjective(obj);
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        <td className="p-3 flex items-center gap-2" style={{ paddingLeft: 16 + depth * 24 }}>
          {hasChildren && (
            <button
              className="focus:outline-none mr-1"
              aria-label={isExpanded ? 'Collapse children' : 'Expand children'}
              tabIndex={0}
              onClick={e => {
                e.stopPropagation();
                setExpanded(prev => ({ ...prev, [obj.id]: !isExpanded }));
              }}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {levelIcons[obj.level]}
          <span className="font-medium text-blue-900">{obj.title}</span>
        </td>
        <td className="p-3">{obj.owner}</td>
        <td className="p-3">
          {obj.tags && obj.tags.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {obj.tags.map(tag => (
                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
                  {tag}
                </span>
              ))}
            </span>
          ) : '-'}
        </td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <ProgressBar value={obj.progress} />
            <span className={
              'font-semibold ' +
              (obj.progress === 0 ? 'text-gray-400' :
               obj.progress >= 70 ? 'text-green-600' :
               obj.progress >= 40 ? 'text-amber-600' :
               'text-red-600')
            }>
              {obj.progress}%
            </span>
          </div>
        </td>
        <td className="p-3">{obj.level.charAt(0).toUpperCase() + obj.level.slice(1)}</td>
        <td className="p-3">{obj.startQuarter} {obj.startYear} - {obj.endQuarter} {obj.endYear}</td>
        <td className="p-3">{obj.endQuarter} {obj.endYear}</td>
      </tr>,
      isExpanded && hasChildren
        ? obj.children!.flatMap(child => renderObjectiveRow(child, depth + 1))
        : null
    ];
  }

  // For expand/collapse all
  function handleExpandCollapseAll() {
    const tree = buildObjectiveTree(sorted);
    // Collect all ids recursively
    function collectIds(nodes: (Objective & { children?: Objective[] })[]): string[] {
      return nodes.flatMap(node => [node.id, ...(node.children ? collectIds(node.children) : [])]);
    }
    const allIds = collectIds(tree);
    const anyCollapsed = allIds.some(id => expanded[id] === false);
    setExpanded(prev => {
      const next: Record<string, boolean> = { ...prev };
      allIds.forEach(id => {
        next[id] = anyCollapsed;
      });
      return next;
    });
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">OKR List</h2>
      <div className="flex items-center mb-4 gap-2">
        <span className="text-gray-500">
          <Search className="w-5 h-5 inline-block mr-1" />
        </span>
        <input
          type="text"
          className="border border-gray-300 rounded px-3 py-1 w-full max-w-xs"
          placeholder="Search objectives, owner, tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th
                key="title"
                className="p-3 text-left font-semibold cursor-pointer select-none"
                onClick={() => handleSort('title')}
              >
                <span className="inline-flex items-center">
                  Objective
                  <button
                    className="ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none"
                    aria-label={
                      Object.values(expanded).some(v => v === false)
                        ? 'Expand all objectives'
                        : 'Collapse all objectives'
                    }
                    tabIndex={0}
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleExpandCollapseAll();
                    }}
                  >
                    {Object.values(expanded).some(v => v === false) ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {sortKey === 'title' && (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </span>
              </th>
              <th
                key="owner"
                className="p-3 text-left font-semibold cursor-pointer select-none"
                onClick={() => handleSort('owner')}
              >
                <span className="inline-flex items-center">
                  Owner
                  {sortKey === 'owner' && (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </span>
              </th>
              <th
                key="tags"
                className="p-3 text-left font-semibold cursor-pointer select-none"
                onClick={() => handleSort('tags')}
              >
                <span className="inline-flex items-center">
                  Initiative
                  {sortKey === 'tags' && (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </span>
              </th>
              <th
                key="progress"
                className="p-3 text-left font-semibold cursor-pointer select-none"
                onClick={() => handleSort('progress')}
              >
                <span className="inline-flex items-center">
                  Progress
                  {sortKey === 'progress' && (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </span>
              </th>
              <th
                key="level"
                className="p-3 text-left font-semibold cursor-pointer select-none"
                onClick={() => handleSort('level')}
              >
                <span className="inline-flex items-center">
                  Team
                  {sortKey === 'level' && (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </span>
              </th>
              <th
                key="timeline"
                className="p-3 text-left font-semibold cursor-pointer select-none"
                onClick={() => handleSort('timeline')}
              >
                <span className="inline-flex items-center">
                  Timeline
                  {sortKey === 'timeline' && (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </span>
              </th>
              <th
                key="due"
                className="p-3 text-left font-semibold cursor-pointer select-none"
                onClick={() => handleSort('due')}
              >
                <span className="inline-flex items-center">
                  Due Date
                  {sortKey === 'due' && (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  )}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {buildObjectiveTree(sorted).flatMap(obj => renderObjectiveRow(obj, 0))}
          </tbody>
        </table>
      </div>
      {detailObjective && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setDetailObjective(null)}
        >
          <div onClick={e => e.stopPropagation()}>
            <ObjectiveDetail objective={detailObjective} onClose={() => setDetailObjective(null)} />
          </div>
        </div>
      )}
    </div>
  );
} 