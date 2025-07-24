import React, { useState, useEffect } from 'react';
import { useOKRData } from '../hooks/useOKRData';
import type { OKRLevel } from '../types';
import type { Objective } from '../types';
import { calculateObjectiveStatus, getProgressBarColor } from '../utils/calculations';
import ObjectiveDetail from './ObjectiveDetail';
import { Quarter } from '../types';
import { ChevronDown, ChevronRight, Search, Building2, Users2, User } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const levels: OKRLevel[] = ['company', 'team', 'individual'];

// Level icon and color mapping
const levelIcons: Record<OKRLevel, { icon: React.ReactNode; color: string }> = {
  company: { icon: <Building2 className="w-4 h-4" />, color: 'text-blue-600' },
  team: { icon: <Users2 className="w-4 h-4" />, color: 'text-green-600' },
  individual: { icon: <User className="w-4 h-4" />, color: 'text-purple-600' },
};

function getQuartersBetween(startYear: number, endYear: number) {
  const quarters = [];
  for (let year = startYear; year <= endYear; year++) {
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4'] as const) {
      quarters.push({ year, quarter: q });
    }
  }
  return quarters;
}

// Tooltip bar cell component
function BarWithTooltip({
  barColor,
  totalKRs,
  completedKRs,
  objTitle,
  tooltipText,
}: {
  barColor: string;
  totalKRs: number;
  completedKRs: number;
  objTitle: string;
  tooltipText: string;
}) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  return (
    <div
      className={`h-4 ${barColor} rounded-full w-20 mx-auto flex items-center justify-center relative cursor-pointer`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {totalKRs === 0 ? (
        <span className="text-xs text-white font-semibold absolute left-1 right-1 text-center" style={{lineHeight: '1rem'}}>
          No KR
        </span>
      ) : (
        <span className="text-xs text-white font-semibold absolute left-1 right-1 text-center" style={{lineHeight: '1rem'}}>
          KR: {completedKRs}/{totalKRs}
        </span>
      )}
      <span className="sr-only">{objTitle}</span>
      {showTooltip && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none">
          {tooltipText}
        </div>
      )}
    </div>
  );
}

type GroupingMode = 'level' | 'hierarchy';

// Helper: recursively check if an objective or any of its descendants match the search
function matchesSearchOrDescendant(obj: Objective, objectives: Objective[], search: string): boolean {
  if (obj.title.toLowerCase().includes(search.toLowerCase())) return true;
  const children = objectives.filter(child => child.parentId === obj.id);
  return children.some(child => matchesSearchOrDescendant(child, objectives, search));
}

export default function GanttChart() {
  const { objectives, currentWorkspace } = useOKRData();
  const currentYear = new Date().getFullYear();
  const [startYear, setStartYear] = useState(currentYear - 1);
  const [endYear, setEndYear] = useState(currentYear + 1);
  const [startQuarter, setStartQuarter] = useState<Quarter>('Q1');
  const [endQuarter, setEndQuarter] = useState<Quarter>('Q4');
  const [detailObjective, setDetailObjective] = useState<null | { objective: Objective }>(null);
  const [grouping, setGrouping] = useState<GroupingMode>('hierarchy');
  const [expandedObjectives, setExpandedObjectives] = useState<{ [id: string]: boolean }>({});
  const [search, setSearch] = useState('');

  // Collapsible panels state, persisted per workspace and period
  const collapseKey = `okr-gantt-collapse-${currentWorkspace}-${startYear}-${startQuarter}-${endYear}-${endQuarter}`;
  // Save on change (in case toggled elsewhere)
  useEffect(() => {
    localStorage.setItem(collapseKey, JSON.stringify({}));
  }, [collapseKey]);

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

  // Generate quarters in the selected range
  const allQuarters = getQuartersBetween(startYear, endYear);
  const quarters = allQuarters.filter(q =>
    isAfterOrEqual(q.year, q.quarter, startYear, startQuarter) &&
    isBeforeOrEqual(q.year, q.quarter, endYear, endQuarter)
  );

  // Filter objectives in the selected range (if any part of their span overlaps) and for current tenant
  const filteredObjectives = objectives.filter(obj =>
    obj.workspaceId === currentWorkspace &&
    isBeforeOrEqual(obj.endYear, obj.endQuarter, endYear, endQuarter) &&
    isAfterOrEqual(obj.startYear, obj.startQuarter, startYear, startQuarter)
  );

  // For hierarchy grouping: filter to show all parents of matches
  function getHierarchyFilteredObjectives(objs: Objective[], search: string): Objective[] {
    if (!search) return objs;
    // Find all matching objectives (by title)
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

  function renderObjectiveRow(obj: Objective & { children?: Objective[] }, level: OKRLevel, depth = 0): React.ReactNode[] {
    const isExpanded = expandedObjectives[obj.id] !== false;
    const hasChildren = obj.children && obj.children.length > 0;
    const parentObj = obj.parentId ? objectives.find(o => o.id === obj.parentId) : null;
    const completedKRs = obj.keyResults.filter(kr => kr.progress === 100).length;
    const totalKRs = obj.keyResults.length;
    const status = calculateObjectiveStatus(obj.progress);
    const barColor = getProgressBarColor(obj.progress);
    const tooltipText = `${obj.title} (${status.replace('-', ' ')}: ${obj.progress}%)`;
    return [
      <tr
        key={obj.id}
        className={twMerge(
          'cursor-pointer hover:bg-blue-100 transition',
          depth > 0 ? 'bg-gray-50' : ''
        )}
        onClick={() => setDetailObjective({ objective: obj })}
      >
        <td className="p-2 border-b align-top">
          <div className="flex items-center" style={{ marginLeft: depth * 24 }}>
            {hasChildren && (
              <button
                className="mr-1 focus:outline-none"
                aria-label={isExpanded ? 'Collapse children' : 'Expand children'}
                tabIndex={0}
                onClick={e => {
                  e.stopPropagation();
                  setExpandedObjectives(prev => ({ ...prev, [obj.id]: !isExpanded }));
                }}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            <span className={`inline-flex items-center justify-center mr-2 align-middle ${levelIcons[level].color}`}>
              {levelIcons[level].icon}
            </span>
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </div>
        </td>
        <td className="p-2 border-b align-top">
          <div className="truncate max-w-xs flex items-center" title={obj.title}>
            {obj.title}
            <span className={`ml-2 text-xs font-bold ${
              obj.progress === 0 ? 'text-gray-400' :
              obj.progress >= 70 ? 'text-green-600' :
              obj.progress >= 40 ? 'text-amber-600' :
              'text-red-600'
            }`}>{obj.progress}%</span>
          </div>
          <div className="text-xs text-gray-500">
            Owner: {obj.owner}
            {parentObj && (
              <>
                {' '}
                <span className="text-gray-400">|</span>{' '}
                Parent: <button
                  className="text-blue-600 hover:underline text-xs"
                  onClick={e => {
                    e.stopPropagation();
                    setDetailObjective({ objective: parentObj });
                  }}
                >{parentObj.title}</button>
              </>
            )}
          </div>
        </td>
        {quarters.map((q, idx) => {
          const inSpan =
            isAfterOrEqual(q.year, q.quarter, obj.startYear, obj.startQuarter) &&
            isBeforeOrEqual(q.year, q.quarter, obj.endYear, obj.endQuarter);
          const borderClass = idx !== 0 ? ' border-l border-gray-100' : '';
          if (!inSpan) {
            return <td key={q.year + q.quarter + obj.id} className={`text-center border-b${borderClass}`}></td>;
          }
          return (
            <td key={q.year + q.quarter + obj.id} className={`text-center border-b${borderClass}`}>
              <BarWithTooltip
                barColor={barColor}
                totalKRs={totalKRs}
                completedKRs={completedKRs}
                objTitle={obj.title}
                tooltipText={tooltipText}
              />
            </td>
          );
        })}
      </tr>,
      isExpanded && hasChildren
        ? obj.children!.flatMap(child => renderObjectiveRow(child, child.level, depth + 1))
        : null
    ];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold mb-6">Timeline</h2>
      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <span className="font-medium">Grouping:</span>
        <button
          className={`px-3 py-1 rounded ${grouping === 'level' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setGrouping('level')}
        >
          By Level
        </button>
        <button
          className={`px-3 py-1 rounded ${grouping === 'hierarchy' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setGrouping('hierarchy')}
        >
          By Parent/Child
        </button>
        <div className="relative flex-1 min-w-0 ml-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-1 pl-10 w-full"
            placeholder="Search objectives..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center flex-wrap gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-0 p-2 rounded-xl border border-blue-200 bg-blue-50/50 shadow-sm w-full">
          <div className="flex-1 min-w-0 flex flex-col bg-blue-50 p-2 rounded-t-xl sm:rounded-l-xl sm:rounded-tr-none sm:rounded-br-none">
            <div className="flex gap-2 w-full">
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium">Start Year:</label>
                <select
                  value={startYear}
                  onChange={e => setStartYear(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 bg-white w-full"
                >
                  {Array.from({ length: 10 }).map((_, i) => {
                    const year = currentYear - 5 + i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium">Start Quarter:</label>
                <select
                  value={startQuarter}
                  onChange={e => setStartQuarter(e.target.value as Quarter)}
                  className="border border-gray-300 rounded px-2 py-1 bg-white w-full"
                >
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>
            </div>
          </div>
          <div className="hidden sm:block w-px bg-blue-200 mx-0" />
          <div className="flex-1 min-w-0 flex flex-col bg-blue-100 p-2 rounded-b-xl sm:rounded-r-xl sm:rounded-tl-none sm:rounded-bl-none">
            <div className="flex gap-2 w-full">
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium">End Year:</label>
                <select
                  value={endYear}
                  onChange={e => setEndYear(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 bg-white w-full"
                >
                  {Array.from({ length: 10 }).map((_, i) => {
                    const year = currentYear - 5 + i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium">End Quarter:</label>
                <select
                  value={endQuarter}
                  onChange={e => setEndQuarter(e.target.value as Quarter)}
                  className="border border-gray-300 rounded px-2 py-1 bg-white w-full"
                >
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 border-b w-32">Level</th>
              <th className="text-left p-2 border-b w-48">Objective</th>
              {quarters.map((q, idx) => (
                <th
                  key={q.year + q.quarter}
                  className={`text-center p-2 border-b min-w-[60px]${idx !== 0 ? ' border-l border-gray-200' : ''}`}
                >
                  {q.quarter} {q.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouping === 'level'
              ? levels.map(level => {
                  // Only show objectives matching the search
                  const levelObjs = filteredObjectives.filter(obj => obj.level === level && (!search || obj.title.toLowerCase().includes(search.toLowerCase())));
                  return levelObjs.length > 0
                    ? buildObjectiveTree(levelObjs).flatMap(obj => renderObjectiveRow(obj, level, 0))
                    : null;
                })
              : buildObjectiveTree(getHierarchyFilteredObjectives(filteredObjectives, search)).flatMap(obj => renderObjectiveRow(obj, obj.level, 0))}
          </tbody>
        </table>
      </div>
      {/* Objective Detail Modal */}
      {detailObjective && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            if (window.isEditing) {
              if (!window.confirm('You have unsaved changes. Closing will discard them. Continue?')) {
                return;
              }
            }
            setDetailObjective(null);
          }}
        >
          <div onClick={e => e.stopPropagation()}>
            <ObjectiveDetail
              objective={detailObjective.objective}
              onClose={() => setDetailObjective(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}