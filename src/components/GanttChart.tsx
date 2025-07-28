import React, { useState, useEffect } from 'react';
import { useOKRData } from '../hooks/useOKRData';
import type { OKRLevel } from '../types';
import type { Objective } from '../types';
import { getProgressBarColor, getStatusColor } from '../utils/calculations';
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

// Level background color mapping
const levelBgColors: Record<OKRLevel, string> = {
  company: 'bg-blue-50',
  team: 'bg-green-50', 
  individual: 'bg-purple-50',
};

function getQuartersBetween(startYear: number, endYear: number, startQuarter?: Quarter, endQuarter?: Quarter) {
  const quarters = [];
  const allQuarters: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  
  for (let year = startYear; year <= endYear; year++) {
    const yearQuarters = allQuarters.map(q => ({ year, quarter: q }));
    
    if (year === startYear && startQuarter) {
      const startIndex = allQuarters.indexOf(startQuarter);
      yearQuarters.splice(0, startIndex);
    }
    
    if (year === endYear && endQuarter) {
      const endIndex = allQuarters.indexOf(endQuarter);
      yearQuarters.splice(endIndex + 1);
    }
    
    quarters.push(...yearQuarters);
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
  const [detailObjective, setDetailObjective] = useState<null | { objective: Objective }>(null);
  const [grouping, setGrouping] = useState<GroupingMode>('hierarchy');
  const [expandedObjectives, setExpandedObjectives] = useState<{ [id: string]: boolean }>({});
  const [search, setSearch] = useState('');
  const [expandedLevels, setExpandedLevels] = useState<{ [level in OKRLevel]?: boolean }>({ company: true, team: true, individual: true });
  
  // Quarter/Year selection state
  const [startYear, setStartYear] = useState(currentYear - 1);
  const [endYear, setEndYear] = useState(currentYear + 1);
  const [startQuarter, setStartQuarter] = useState<Quarter>('Q1');
  const [endQuarter, setEndQuarter] = useState<Quarter>('Q4');

  // Collapsible panels state, persisted per workspace and period
  const collapseKey = `okr-gantt-collapse-${currentWorkspace}-${currentYear}-Q1-${currentYear}-Q4`;
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

  // Helper: for a search, return all matching objectives and their parents
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
    const barColor = getProgressBarColor(obj.progress);
    const tooltipText = `${obj.title} (${obj.status.replace('-', ' ')}: ${obj.progress}%)`;
    const statusColor = getStatusColor(obj.status);
    const statusText = obj.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
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
        <td className="p-2 border-b align-top">
          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColor}`}>
            {statusText}
          </span>
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

  const quarters = getQuartersBetween(startYear, endYear, startQuarter, endQuarter);
  const filteredObjectives = getHierarchyFilteredObjectives(objectives, search);

  // Group objectives by level for level grouping
  const objectivesByLevel = levels.reduce((acc, level) => {
    acc[level] = filteredObjectives.filter(obj => obj.level === level);
    return acc;
  }, {} as Record<OKRLevel, Objective[]>);

  // Build tree for hierarchy grouping
  const objectiveTree = buildObjectiveTree(filteredObjectives);

  // Expand/collapse all functionality
  function handleExpandCollapseAll() {
    const allIds = new Set<string>();
    function collectIds(nodes: (Objective & { children?: Objective[] })[]) {
      nodes.forEach(node => {
        allIds.add(node.id);
        if (node.children) collectIds(node.children);
      });
    }
    collectIds(objectiveTree);

    const allExpanded = Object.values(expandedObjectives).every(v => v === true);
    const newExpanded: Record<string, boolean> = {};
    allIds.forEach(id => {
      newExpanded[id] = !allExpanded;
    });
    setExpandedObjectives(newExpanded);
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
          Level
        </button>
        <button
          className={`px-3 py-1 rounded ${grouping === 'hierarchy' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setGrouping('hierarchy')}
        >
          Parent/Child
        </button>
        <div className="flex items-center gap-2 ml-4">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder="Search objectives..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        {/* Quarter/Year Selection */}
        <div className="flex items-center gap-2 ml-4">
          <span className="font-medium">Period:</span>
          <select
            value={startQuarter}
            onChange={e => setStartQuarter(e.target.value as Quarter)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>
          <input
            type="number"
            value={startYear}
            onChange={e => setStartYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-16"
            min={2020}
            max={2030}
          />
          <span className="text-gray-500">to</span>
          <select
            value={endQuarter}
            onChange={e => setEndQuarter(e.target.value as Quarter)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>
          <input
            type="number"
            value={endYear}
            onChange={e => setEndYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-16"
            min={2020}
            max={2030}
          />
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left font-semibold border-b">
                <div className="flex items-center">
                  <span>Level</span>
                  {grouping === 'hierarchy' && (
                    <button
                      className="ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none"
                      aria-label={
                        Object.values(expandedObjectives).some(v => v === false)
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
                      {Object.values(expandedObjectives).some(v => v === false) ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </th>
              <th className="p-2 text-left font-semibold border-b">Objective</th>
              <th className="p-2 text-left font-semibold border-b">Status</th>
              {quarters.map(q => (
                <th key={q.year + q.quarter} className="p-2 text-center font-semibold border-b border-l border-gray-100">
                  {q.quarter} {q.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouping === 'level' ? (
              levels.map(level => {
                const levelObjectives = objectivesByLevel[level];
                if (levelObjectives.length === 0) return null;
                
                const isLevelExpanded = expandedLevels[level] !== false;
                
                return [
                  <tr key={`level-${level}`} className={levelBgColors[level]}>
                    <td colSpan={3 + quarters.length} className="p-2">
                      <div className="flex items-center">
                        <button
                          className="mr-2 focus:outline-none"
                          onClick={() => setExpandedLevels(prev => ({ ...prev, [level]: !isLevelExpanded }))}
                        >
                          {isLevelExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <span className={`inline-flex items-center justify-center mr-2 ${levelIcons[level].color}`}>
                          {levelIcons[level].icon}
                        </span>
                        <span className="font-semibold capitalize">{level} Objectives</span>
                      </div>
                    </td>
                  </tr>,
                  isLevelExpanded && levelObjectives.map(obj => renderObjectiveRow({ ...obj, children: [] }, level))
                ];
              }).flat()
            ) : (
              objectiveTree.flatMap(obj => renderObjectiveRow(obj, obj.level))
            )}
          </tbody>
        </table>
      </div>

      {detailObjective && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setDetailObjective(null)}
        >
          <div onClick={e => e.stopPropagation()}>
            <ObjectiveDetail objective={detailObjective.objective} onClose={() => setDetailObjective(null)} />
          </div>
        </div>
      )}
    </div>
  );
}