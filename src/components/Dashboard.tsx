import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Search, Building2, Users2, User, Target } from 'lucide-react';
import { useOKRData } from '../hooks/useOKRData';
import { Quarter } from '../types';
import ObjectiveCard from './ObjectiveCard';
import CreateObjectiveModal from './CreateObjectiveModal';
import ObjectiveDetail from './ObjectiveDetail';
import type { Objective } from '../types';

interface DashboardProps {
  searchTerm: string;
  onSearch?: (term: string) => void;
}

export default function Dashboard({ searchTerm, onSearch }: DashboardProps) {
  const { getCurrentObjectives, settings, currentWorkspace } = useOKRData();
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Remove searchTerm from Dashboard; will be handled in Header
  const [detailObjective, setDetailObjective] = useState<Objective | null>(null);

  const { currentQuarter, currentYear } = settings;
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
  // Show objectives if the current quarter/year falls within their span (inclusive)
  const objectives = getCurrentObjectives().filter(obj =>
    isAfterOrEqual(currentYear, currentQuarter as Quarter, obj.startYear, obj.startQuarter) &&
    isBeforeOrEqual(currentYear, currentQuarter as Quarter, obj.endYear, obj.endQuarter)
  );
  
  // Accept filteredObjectives as a prop or from context in the future
  const filteredObjectives = objectives.filter(obj => {
    const matchesSearch = obj.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = true; // No filter applied in this version
    return matchesSearch && matchesFilter;
  });

  // Only root-level company objectives (no parentId)
  const companyObjectives = filteredObjectives.filter(obj => obj.level === 'company' && !obj.parentId);
  const teamObjectives = filteredObjectives.filter(obj => obj.level === 'team');
  const individualObjectives = filteredObjectives.filter(obj => obj.level === 'individual');

  const getGroupProgress = (objs: Objective[]) =>
    objs.length > 0 ? Math.round(objs.reduce((sum, obj) => sum + obj.progress, 0) / objs.length) : 0;
  const companyProgress = getGroupProgress(companyObjectives);
  const teamProgress = getGroupProgress(teamObjectives);
  const individualProgress = getGroupProgress(individualObjectives);

  // Collapsible panels state
  // Persist expand/collapse state per workspace/period
  const expandKey = `okr-dashboard-expand-${currentWorkspace}-${settings.currentYear}-${settings.currentQuarter}`;
  const [showCompany, setShowCompany] = useState(() => {
    const saved = localStorage.getItem(expandKey);
    if (saved) try { return JSON.parse(saved).showCompany; } catch { return true; }
    return true;
  });
  const [showTeam, setShowTeam] = useState(() => {
    const saved = localStorage.getItem(expandKey);
    if (saved) try { return JSON.parse(saved).showTeam; } catch { return true; }
    return true;
  });
  const [showIndividual, setShowIndividual] = useState(() => {
    const saved = localStorage.getItem(expandKey);
    if (saved) try { return JSON.parse(saved).showIndividual; } catch { return true; }
    return true;
  });
  useEffect(() => {
    localStorage.setItem(expandKey, JSON.stringify({ showCompany, showTeam, showIndividual }));
  }, [showCompany, showTeam, showIndividual, expandKey]);

  const rootObjectives = objectives.filter(obj => !obj.parentId);
  const overallProgress = rootObjectives.length > 0 
    ? Math.round(rootObjectives.reduce((sum, obj) => sum + obj.progress, 0) / rootObjectives.length)
    : 0;

  // Map progress % to text color using Analytics Progress Distribution legend
  const progressTextColor = (progress: number) => {
    if (progress === 0) return 'text-gray-500';
    if (progress > 0 && progress < 40) return 'text-red-600';
    if (progress >= 40 && progress < 70) return 'text-amber-600';
    if (progress >= 70 && progress < 100) return 'text-blue-600';
    if (progress === 100) return 'text-green-600';
    return 'text-gray-600';
  };

  const levelIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    company: { icon: <Building2 className="w-4 h-4" />, color: 'text-blue-600' },
    team: { icon: <Users2 className="w-4 h-4" />, color: 'text-green-600' },
    individual: { icon: <User className="w-4 h-4" />, color: 'text-purple-600' },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {settings.currentQuarter} {settings.currentYear} OKRs
            </h2>
            <p className="text-gray-600 mt-1">
              Track and manage your objectives and key results
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-2 w-full">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors whitespace-nowrap"
              aria-label="Create new objective"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>New Objective</span>
            </button>
            <div className="flex items-center gap-2 w-full">
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Search className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-4 py-2 pl-10 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Search objectives..."
                  value={searchTerm}
                  onChange={e => onSearch && onSearch(e.target.value)}
                  style={{ minWidth: 320 }}
                />
              </div>
              {/* Removed filterLevel dropdown */}
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200 cursor-pointer hover:bg-blue-50 transition"
            onClick={() => {}}
          >
            <h3 className="text-sm font-medium text-gray-600 mb-2">Overall Progress</h3>
            <div className="text-3xl font-bold text-gray-900 mb-2">{overallProgress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 cursor-pointer hover:bg-green-50 transition"
            onClick={() => {}}
          >
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Objectives</h3>
            <div className="text-3xl font-bold text-gray-900">{objectives.length}</div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 cursor-pointer hover:bg-purple-50 transition"
            onClick={() => {}}
          >
            <h3 className="text-sm font-medium text-gray-600 mb-2">Key Results</h3>
            <div className="text-3xl font-bold text-gray-900">
              {objectives.reduce((sum, obj) => sum + obj.keyResults.length, 0)}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 cursor-pointer hover:bg-amber-50 transition"
            onClick={() => {}}
          >
            <h3 className="text-sm font-medium text-gray-600 mb-2">Completed</h3>
            <div className="text-3xl font-bold text-green-600">
              {objectives.filter(obj => obj.progress === 100).length}
            </div>
          </div>
        </div>

        {/* Filters moved above */}
      </div>

      {/* Main Content and Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Objectives Panel */}
          <section>
            <div
              className="flex items-center cursor-pointer mb-2 rounded px-3 py-2 select-none"
              style={{ background: '#e0edfa' }}
              onClick={() => setShowCompany((v: boolean) => !v)}
            >
              <span className={`inline-flex items-center justify-center mr-3 align-middle ${levelIcons['company'].color}`}>
                {levelIcons['company'].icon}
              </span>
              <h3 className="text-xl font-semibold text-gray-900 flex-1">
                Company Objectives ({companyObjectives.length})
                {companyObjectives.length > 0 && (
                  <span className={`ml-2 text-base font-bold ${progressTextColor(companyProgress)} flex items-center gap-2`}>
                    • {companyProgress}%
                    <span className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <span className="block h-2 bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${companyProgress}%` }} />
                    </span>
                  </span>
                )}
              </h3>
              <button
                className="ml-2 bg-blue-600 text-white px-2 py-1 rounded flex items-center space-x-1 hover:bg-blue-700 text-xs"
                onClick={e => { e.stopPropagation(); }}
                title="Add Company Objective"
                aria-label="Add Company Objective"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>New</span>
              </button>
              <span className={`text-blue-600 text-lg font-bold select-none transition-transform duration-300 ${showCompany ? 'rotate-90' : ''}`}>
                {showCompany ? <ChevronDown className="w-5 h-5" aria-hidden="true" /> : <ChevronRight className="w-5 h-5" aria-hidden="true" />}
              </span>
            </div>
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-x-6 transition-all duration-300 ease-in-out ${showCompany ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
              style={{ willChange: 'max-height, opacity' }}
            >
              {showCompany && companyObjectives.map(objective => (
                <ObjectiveCard key={objective.id} objective={objective} />
              ))}
            </div>
          </section>

          {/* Team Objectives Panel */}
          <section>
            <div
              className="flex items-center cursor-pointer mb-2 rounded px-3 py-2"
              style={{ background: '#f0fdf4' }}
              onClick={() => setShowTeam((v: boolean) => !v)}
            >
              <span className={`inline-flex items-center justify-center mr-3 align-middle ${levelIcons['team'].color}`}>
                {levelIcons['team'].icon}
              </span>
              <h3 className="text-xl font-semibold text-gray-900 flex-1">
                Team Objectives ({teamObjectives.length})
                {teamObjectives.length > 0 && (
                  <span className={`ml-2 text-base font-bold ${progressTextColor(teamProgress)} flex items-center gap-2`}>
                    • {teamProgress}%
                    <span className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <span className="block h-2 bg-green-600 rounded-full transition-all duration-300" style={{ width: `${teamProgress}%` }} />
                    </span>
                  </span>
                )}
              </h3>
              <button
                className="ml-2 bg-green-600 text-white px-2 py-1 rounded flex items-center space-x-1 hover:bg-green-700 text-xs"
                onClick={e => { e.stopPropagation(); }}
                title="Add Team Objective"
                aria-label="Add Team Objective"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>New</span>
              </button>
              <span className="text-green-600 text-lg font-bold select-none">
                {showTeam ? <ChevronDown className="w-5 h-5" aria-hidden="true" /> : <ChevronRight className="w-5 h-5" aria-hidden="true" />}
              </span>
            </div>
            {showTeam && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {teamObjectives.map(objective => (
                  <ObjectiveCard key={objective.id} objective={objective} />
                ))}
              </div>
            )}
          </section>

          {/* Individual Objectives Panel */}
          <section>
            <div
              className="flex items-center cursor-pointer mb-2 rounded px-3 py-2"
              style={{ background: '#f3e8fa' }}
              onClick={() => setShowIndividual((v: boolean) => !v)}
            >
              <span className={`inline-flex items-center justify-center mr-3 align-middle ${levelIcons['individual'].color}`}>
                {levelIcons['individual'].icon}
              </span>
              <h3 className="text-xl font-semibold text-gray-900 flex-1">
                Individual Objectives ({individualObjectives.length})
                {individualObjectives.length > 0 && (
                  <span className={`ml-2 text-base font-bold ${progressTextColor(individualProgress)} flex items-center gap-2`}>
                    • {individualProgress}%
                    <span className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <span className="block h-2 bg-purple-600 rounded-full transition-all duration-300" style={{ width: `${individualProgress}%` }} />
                    </span>
                  </span>
                )}
              </h3>
              <button
                className="ml-2 bg-purple-600 text-white px-2 py-1 rounded flex items-center space-x-1 hover:bg-purple-700 text-xs"
                onClick={e => { e.stopPropagation(); }}
                title="Add Individual Objective"
                aria-label="Add Individual Objective"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>New</span>
              </button>
              <span className="text-purple-600 text-lg font-bold select-none">
                {showIndividual ? <ChevronDown className="w-5 h-5" aria-hidden="true" /> : <ChevronRight className="w-5 h-5" aria-hidden="true" />}
              </span>
            </div>
            {showIndividual && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {individualObjectives.map(objective => (
                  <ObjectiveCard key={objective.id} objective={objective} />
                ))}
              </div>
            )}
          </section>

          {filteredObjectives.length === 0 && (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No objectives found</h3>
              <p className="text-gray-600 mb-6">
                {objectives.length === 0 
                  ? "Get started by creating your first objective for this quarter."
                  : "Try adjusting your search or filters to find what you're looking for."
                }
              </p>
              {objectives.length === 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create First Objective
                </button>
              )}
            </div>
          )}
        </div>
        {/* Right Panel: Recent Activity */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {objectives
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 3)
                .map(obj => (
                  <button
                    key={obj.id}
                    className="flex items-center justify-between p-3 rounded-lg w-full text-left transition-colors cursor-pointer"
                    onClick={() => setDetailObjective(obj)}
                    aria-label={`View details for ${obj.title}`}
                  >
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 truncate">{obj.title}</h4>
                      <p className="text-xs text-gray-600">
                        Updated {new Date(obj.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{obj.progress}%</div>
                      <div className="w-12 bg-gray-200 rounded-full h-1 mt-1">
                        <div 
                          className={`h-1 rounded-full ${
                            obj.progress === 0 ? 'bg-gray-400' :
                            obj.progress < 40 ? 'bg-red-500' :
                            obj.progress < 70 ? 'bg-amber-500' :
                            obj.progress < 100 ? 'bg-blue-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${obj.progress}%` }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Objective Modal */}
      {showCreateModal && (
        <CreateObjectiveModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* Objective Detail Modal */}
      {detailObjective && (
        <ObjectiveDetail objective={detailObjective} onClose={() => setDetailObjective(null)} />
      )}
    </div>
  );
}