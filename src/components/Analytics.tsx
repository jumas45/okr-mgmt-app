import React from 'react';
import { BarChart, TrendingUp, Target, Award, Archive, Building2, Users2, User } from 'lucide-react';
import { X as XIcon } from 'lucide-react';
import { useOKRData } from '../hooks/useOKRData';
import ObjectiveDetail from './ObjectiveDetail';
import type { Objective } from '../types';

export default function Analytics() {
  const { getCurrentObjectives, getArchivedObjectives, settings } = useOKRData();
  const currentObjectives = getCurrentObjectives();
  const archivedObjectives = getArchivedObjectives();

  const [detailObjective, setDetailObjective] = React.useState<Objective | null>(null);
  const [filteredModal, setFilteredModal] = React.useState<{ title: string; objectives: Objective[] } | null>(null);
  // Get all unique owners
  const allOwners = Array.from(new Set(currentObjectives.map(obj => obj.owner))).sort();
  const [userFilter, setUserFilter] = React.useState<string>('');

  // Compute tag counts
  const tagCounts: Record<string, number> = {};
  currentObjectives.forEach(obj => {
    obj.tags.forEach(tag => {
      if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const allTags = Object.keys(tagCounts).sort((a, b) => a.localeCompare(b));

  // Calculate metrics
  const totalObjectives = currentObjectives.length;
  const totalKeyResults = currentObjectives.reduce((sum, obj) => sum + obj.keyResults.length, 0);
  const completedObjectives = currentObjectives.filter(obj => obj.progress === 100).length;
  const averageProgress = totalObjectives > 0 
    ? Math.round(currentObjectives.reduce((sum, obj) => sum + obj.progress, 0) / totalObjectives)
    : 0;

  // Progress distribution
  const progressRanges = {
    'Not Started (0%)': currentObjectives.filter(obj => obj.progress === 0).length,
    'Behind (1-39%)': currentObjectives.filter(obj => obj.progress > 0 && obj.progress < 40).length,
    'At Risk (40-69%)': currentObjectives.filter(obj => obj.progress >= 40 && obj.progress < 70).length,
    'On Track (70-99%)': currentObjectives.filter(obj => obj.progress >= 70 && obj.progress < 100).length,
    'Completed (100%)': currentObjectives.filter(obj => obj.progress === 100).length,
  };

  // Level breakdown
  const levelBreakdown = {
    company: currentObjectives.filter(obj => obj.level === 'company').length,
    team: currentObjectives.filter(obj => obj.level === 'team').length,
    individual: currentObjectives.filter(obj => obj.level === 'individual').length,
  };

  const getRangeColor = (range: string) => {
    switch (range) {
      case 'Not Started (0%)': return 'bg-gray-400';
      case 'Behind (1-39%)': return 'bg-red-500';
      case 'At Risk (40-69%)': return 'bg-amber-500';
      case 'On Track (70-99%)': return 'bg-blue-500';
      case 'Completed (100%)': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'company': return 'bg-blue-500';
      case 'team': return 'bg-green-500';
      case 'individual': return 'bg-purple-500';
      default: return 'bg-gray-400';
    }
  };

  // Helper to open modal with filtered objectives
  const openFilteredModal = (title: string, filterFn: (obj: Objective) => boolean) => {
    setFilteredModal({
      title,
      objectives: currentObjectives.filter(filterFn)
    });
  };

  const levelIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    company: { icon: <Building2 className="w-4 h-4" />, color: 'text-blue-600' },
    team: { icon: <Users2 className="w-4 h-4" />, color: 'text-green-600' },
    individual: { icon: <User className="w-4 h-4" />, color: 'text-purple-600' },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
        <p className="text-gray-600">
          Insights and metrics for {settings.currentQuarter} {settings.currentYear}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 cursor-pointer hover:bg-blue-50 transition mb-2 mr-2"
          onClick={() => openFilteredModal('Active Objectives', obj => obj.progress < 100)}
        >
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">{totalObjectives}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Active Objectives</h3>
        </div>

        <div className="bg-green-50 p-6 rounded-xl border border-green-100 cursor-pointer hover:bg-green-100 transition mb-2 mr-2"
          onClick={() => openFilteredModal('Completed Objectives', obj => obj.progress === 100)}
        >
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{completedObjectives}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-700">Completed</h3>
        </div>

        <div className="bg-red-50 p-6 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100 transition mb-2 mr-2"
          onClick={() => openFilteredModal('Objectives Not Started', obj => obj.progress === 0)}
        >
          <div className="flex items-center justify-between mb-2">
            <XIcon className="w-8 h-8 text-red-500" />
            <span className="text-2xl font-bold text-gray-900">{currentObjectives.filter(obj => obj.progress === 0).length}</span>
          </div>
          <h3 className="text-sm font-medium text-red-700">Objectives Not Started</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 cursor-pointer hover:bg-blue-50 transition mb-2 mr-2"
          onClick={() => openFilteredModal('Key Results (Objectives with KRs)', obj => obj.keyResults.length > 0)}
        >
          <div className="flex items-center justify-between mb-2">
            <BarChart className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{totalKeyResults}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Key Results</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 cursor-pointer hover:bg-purple-50 transition mb-2 mr-2"
          onClick={() => openFilteredModal('Objectives with Progress', obj => obj.progress > 0)}
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">{averageProgress}%</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">Average Progress</h3>
        </div>

        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100 cursor-pointer hover:bg-yellow-100 transition mb-2 mr-2"
          onClick={() => setFilteredModal({ title: 'Archived Objectives', objectives: archivedObjectives })}
        >
          <div className="flex items-center justify-between mb-2">
            <Archive className="w-8 h-8 text-yellow-600" />
            <span className="text-2xl font-bold text-gray-900">{archivedObjectives.length}</span>
          </div>
          <h3 className="text-sm font-medium text-yellow-700">Archived</h3>
        </div>
      </div>

      {/* Row 1: Tags */}
      <div className="mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Tags</h3>
          {allTags.length === 0 ? (
            <div className="text-gray-500">No tags found.</div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium border border-blue-200 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition cursor-pointer mb-2 mr-2"
                  onClick={() => openFilteredModal(`Objectives tagged "${tag}"`, obj => obj.tags.includes(tag))}
                  type="button"
                >
                  {tag} <span className="ml-1">({tagCounts[tag]})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Objectives by Level and Progress Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Objectives by Level</h3>
          <div className="space-y-4">
            {Object.entries(levelBreakdown).map(([level, count]) => (
              <button key={level} className="flex items-center justify-between w-full hover:bg-blue-50 rounded transition p-1 mb-2 mr-2"
                onClick={() => openFilteredModal(`${level.charAt(0).toUpperCase() + level.slice(1)} Objectives`, obj => obj.level === level)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded ${getLevelColor(level)}`} />
                  <span className="text-sm text-gray-700 capitalize">{level}</span>
                </div>
                <span className="font-medium text-gray-900">{count}</span>
              </button>
            ))}
          </div>
          {/* Visual bar chart */}
          <div className="mt-6 space-y-3">
            {Object.entries(levelBreakdown).map(([level, count]) => {
              const percentage = totalObjectives > 0 ? (count / totalObjectives) * 100 : 0;
              return (
                <div key={level} className="flex items-center space-x-3">
                  <div className="w-16 text-sm text-gray-600 capitalize">{level}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${getLevelColor(level)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-8 text-sm text-gray-600">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Progress Distribution</h3>
          <div className="space-y-4">
            {Object.entries(progressRanges).map(([range, count]) => (
              <button key={range} className="flex items-center justify-between w-full hover:bg-blue-50 rounded transition p-1 mb-2 mr-2"
                onClick={() => {
                  let filterFn: (obj: Objective) => boolean = () => false;
                  if (range === 'Not Started (0%)') filterFn = obj => obj.progress === 0;
                  else if (range === 'Behind (1-39%)') filterFn = obj => obj.progress > 0 && obj.progress < 40;
                  else if (range === 'At Risk (40-69%)') filterFn = obj => obj.progress >= 40 && obj.progress < 70;
                  else if (range === 'On Track (70-99%)') filterFn = obj => obj.progress >= 70 && obj.progress < 100;
                  else if (range === 'Completed (100%)') filterFn = obj => obj.progress === 100;
                  openFilteredModal(range, filterFn);
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded ${getRangeColor(range)}`} />
                  <span className="text-sm text-gray-700">{range}</span>
                </div>
                <span className="font-medium text-gray-900">{count}</span>
              </button>
            ))}
          </div>
          {/* Visual bar chart */}
          <div className="mt-6 space-y-2">
            {Object.entries(progressRanges).map(([range, count]) => {
              const percentage = totalObjectives > 0 ? (count / totalObjectives) * 100 : 0;
              return (
                <div key={range} className="flex items-center space-x-3">
                  <div className="w-20 text-xs text-gray-600 truncate">{range.split(' ')[0]}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getRangeColor(range)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-8 text-xs text-gray-600">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Performance Summary and Objectives by Person */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Performance Summary</h3>
          <div className="space-y-4">
            <button className="flex items-center justify-between p-3 bg-green-50 rounded-lg w-full hover:bg-green-100 transition"
              onClick={() => openFilteredModal('Completed Objectives', obj => obj.progress === 100)}
            >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-700">Completion Rate</span>
              </div>
              <span className="font-medium text-gray-900">
                {totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0}%
              </span>
            </button>
            <button className="flex items-center justify-between p-3 bg-blue-50 rounded-lg w-full hover:bg-blue-100 transition"
              onClick={() => openFilteredModal('On Track Objectives', obj => obj.progress >= 70 && obj.progress < 100)}
            >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-sm text-gray-700">On Track</span>
              </div>
              <span className="font-medium text-gray-900">
                {progressRanges['On Track (70-99%)']} objectives
              </span>
            </button>
            <button className="flex items-center justify-between p-3 bg-amber-50 rounded-lg w-full hover:bg-amber-100 transition"
              onClick={() => openFilteredModal('Need Attention', obj => obj.progress >= 1 && obj.progress < 70)}
            >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                <span className="text-sm text-gray-700">Need Attention</span>
              </div>
              <span className="font-medium text-gray-900">
                {progressRanges['At Risk (40-69%)'] + progressRanges['Behind (1-39%)']} objectives
              </span>
            </button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Objectives by Person</h3>
          <div className="mb-4 relative">
            <label className="text-sm text-gray-600 mr-2">Filter by user:</label>
            <input
              type="text"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
              placeholder="Type to search users..."
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
            />
            {userFilter && (
              <ul className="absolute left-0 right-0 bg-white border border-gray-200 rounded shadow z-10 mt-1 max-h-40 overflow-y-auto">
                {allOwners.filter(owner => owner.toLowerCase().includes(userFilter.toLowerCase())).length === 0 ? (
                  <li className="px-3 py-2 text-gray-400 text-sm">No users found</li>
                ) : (
                  allOwners.filter(owner => owner.toLowerCase().includes(userFilter.toLowerCase())).map(owner => (
                    <li
                      key={owner}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                      onClick={() => setUserFilter(owner)}
                    >
                      {owner}
                    </li>
                  ))
                )}
              </ul>
            )}
            {userFilter && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                onClick={() => setUserFilter('')}
                title="Clear filter"
              >
                ×
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(userFilter ? [userFilter] : allOwners).map(owner => {
              const count = currentObjectives.filter(obj => obj.owner === owner).length;
              return (
                <button
                  key={owner}
                  className="w-full text-left py-2 px-3 rounded border border-gray-200 bg-gray-50 hover:bg-blue-50 flex items-center justify-between mb-2 mr-2"
                  onClick={() => openFilteredModal(`Objectives for ${owner}`, obj => obj.owner === owner)}
                >
                  <span className="font-medium text-gray-900">{owner}</span>
                  <span className="text-xs text-gray-500">{count} objective{count !== 1 ? 's' : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {detailObjective && (
        <ObjectiveDetail
          objective={detailObjective}
          onClose={() => setDetailObjective(null)}
        />
      )}
      {/* Filtered Objectives Modal */}
      {filteredModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => {
            if (window.isEditing) {
              if (!window.confirm('You have unsaved changes. Closing will discard them. Continue?')) {
                return;
              }
            }
            setFilteredModal(null);
          }}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-6 relative shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => {
                if (window.isEditing) {
                  if (!window.confirm('You have unsaved changes. Closing will discard them. Continue?')) {
                    return;
                  }
                }
                setFilteredModal(null);
              }}
            >
              <XIcon className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-semibold mb-4">{filteredModal.title}</h3>
            {filteredModal.objectives.length === 0 ? (
              <p className="text-gray-500">No objectives found.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {['company', 'team', 'individual'].map(level => (
                  filteredModal.objectives
                    .filter(obj => obj.level === level)
                    .map(obj => {
                      let bg = '';
                      if (obj.level === 'company') bg = 'bg-blue-50';
                      else if (obj.level === 'team') bg = 'bg-green-50';
                      else if (obj.level === 'individual') bg = 'bg-purple-50';
                      // Progress color coding
                      let progressColor = 'text-gray-400';
                      if (obj.progress >= 70) progressColor = 'text-green-600';
                      else if (obj.progress >= 40) progressColor = 'text-amber-600';
                      else if (obj.progress > 0) progressColor = 'text-red-600';
                      return (
                        <li key={obj.id} className="border border-gray-200 rounded mb-2">
                          <div
                            className={`w-full text-left py-2 px-1 rounded flex flex-col ${bg} hover:bg-opacity-80 cursor-pointer`}
                            onClick={() => { setDetailObjective(obj); setFilteredModal(null); }}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center justify-center ${levelIcons[obj.level]?.color || ''}`} title={obj.level.charAt(0).toUpperCase() + obj.level.slice(1)}>
                                {levelIcons[obj.level]?.icon}
                              </span>
                              <span className="font-medium text-gray-900">{obj.title}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {obj.owner} &middot; <span className={progressColor}>{obj.progress}%</span>
                            </span>
                          </div>
                        </li>
                      );
                    })
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}