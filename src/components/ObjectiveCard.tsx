import React, { useState } from 'react';
import { ChevronRight, MoreVertical, Edit, Trash2, User, X, Building2, Users2 } from 'lucide-react';
import { Objective } from '../types';
import { useOKRData } from '../hooks/useOKRData';
import { calculateObjectiveStatus, getStatusColor, getProgressBarColor } from '../utils/calculations';
import ObjectiveDetail from './ObjectiveDetail';

interface ObjectiveCardProps {
  objective: Objective;
}

// Simple Tooltip component
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = React.useState(false);
  return (
    <span
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
}

// Helper to get avatar initials
function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

// Helper: get all descendants (recursive)
function getDescendantsWithLevels(objId: string, allObjs: Objective[]): Objective[] {
  const descendants: Objective[] = [];
  function findChildren(id: string) {
    allObjs.filter(o => o.parentId === id).forEach(child => {
      descendants.push(child);
      findChildren(child.id);
    });
  }
  findChildren(objId);
  return descendants;
}

export default function ObjectiveCard({ objective }: ObjectiveCardProps) {
  const { deleteObjective, archiveObjective, objectives, updateTrigger } = useOKRData();
  const [showDetail, setShowDetail] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Get the current objective data to ensure we have the latest state
  const currentObjective = React.useMemo(() => 
    objectives.find(obj => obj.id === objective.id) || objective,
    [objectives, objective.id, updateTrigger]
  );
  
  const status = calculateObjectiveStatus(objective.progress);
  const statusColor = getStatusColor(status);
  const progressColor = getProgressBarColor(objective.progress);

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleArchive = () => {
    setShowArchiveModal(true);
  };

  const levelIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    company: { icon: <Building2 className="w-4 h-4" />, color: 'text-blue-600' },
    team: { icon: <Users2 className="w-4 h-4" />, color: 'text-green-600' },
    individual: { icon: <User className="w-4 h-4" />, color: 'text-purple-600' },
  };

  // Archive modal logic
  const allDescendants = getDescendantsWithLevels(objective.id, objectives);
  const companyCount = (objective.level === 'company' ? 1 : 0) + allDescendants.filter(o => o.level === 'company').length;
  const teamCount = (objective.level === 'team' ? 1 : 0) + allDescendants.filter(o => o.level === 'team').length;
  const individualCount = (objective.level === 'individual' ? 1 : 0) + allDescendants.filter(o => o.level === 'individual').length;

  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative shadow-lg" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowDeleteModal(false)}>
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Delete Objective</h3>
            <p className="mb-4 text-gray-700">Are you sure you want to delete this objective?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={() => { deleteObjective(objective.id); setShowDeleteModal(false); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowArchiveModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative shadow-lg" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowArchiveModal(false)}>
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Archive Objective</h3>
            <p className="mb-2 text-gray-700">Are you sure you want to archive this objective?</p>
            <p className="mb-2 text-gray-700">This will also archive all its descendants.</p>
            <div className="mb-4">
              <div className="font-medium text-gray-900 mb-1">Objectives to be archived:</div>
              <ul className="list-disc list-inside text-gray-700 text-sm">
                {companyCount > 0 && <li>Company: {companyCount}</li>}
                {teamCount > 0 && <li>Team: {teamCount}</li>}
                {individualCount > 0 && <li>Individual: {individualCount}</li>}
              </ul>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowArchiveModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600" onClick={() => {
                allDescendants.forEach(desc => archiveObjective(desc.id));
                archiveObjective(objective.id);
                setShowArchiveModal(false);
              }}>Archive</button>
            </div>
          </div>
        </div>
      )}
      <div 
        className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer min-w-[260px] max-w-[320px] flex flex-col justify-between group"
        style={{ minHeight: 190 }}
        onClick={(e) => {
          // Don't trigger if clicking on menu or buttons
          if (!(e.target as HTMLElement).closest('button')) {
            setShowDetail(true);
          }
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center justify-center mr-2 align-middle ${levelIcons[currentObjective.level]?.color || ''}`} title={currentObjective.level.charAt(0).toUpperCase() + currentObjective.level.slice(1)}>
              {levelIcons[currentObjective.level]?.icon}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor} border border-opacity-30 border-current`}>{status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
          </div>
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
              aria-label="Show objective options menu"
              aria-haspopup="menu"
              aria-expanded={showMenu}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" aria-hidden="true" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-10 min-w-[120px]">
                <button
                  onClick={() => {
                    setShowDetail(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" aria-hidden="true" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={handleArchive}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                >
                  <User className="w-4 h-4" aria-hidden="true" />
                  <span>Archive</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <Tooltip text={currentObjective.title}>
          <h3
            className="text-base font-semibold text-gray-900 mb-1 truncate"
            style={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {currentObjective.title}
          </h3>
        </Tooltip>
        {currentObjective.description && (
          <Tooltip text={currentObjective.description}>
            <p className="text-gray-500 text-xs mb-2 line-clamp-1" style={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentObjective.description}
            </p>
          </Tooltip>
        )}
        {/* Tags as pills */}
        {currentObjective.tags && currentObjective.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {currentObjective.tags.map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Progress */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-bold text-gray-900">{currentObjective.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${currentObjective.progress}%` }}
            />
          </div>
        </div>

        {/* Key Results Preview */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Key Results</span>
            <span className="text-xs text-gray-500">{currentObjective.keyResults.length}</span>
          </div>
          {expanded ? (
            currentObjective.keyResults.length > 0 ? (
              <div className="space-y-2">
                {currentObjective.keyResults.map(kr => (
                  <div key={kr.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700 truncate flex-1">{kr.title}</span>
                    <span className="text-sm font-medium text-gray-900 ml-2">{kr.progress}%</span>
                  </div>
                ))}
                <button
                  onClick={() => setExpanded(false)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1 mt-1"
                >
                  <span>Show less</span>
                  <ChevronRight className="w-3 h-3 rotate-90" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No key results yet</p>
            )
          ) : (
            <>
              {currentObjective.keyResults.length > 0 ? (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <span>Show details</span>
                  <ChevronRight className="w-3 h-3" aria-hidden="true" />
                </button>
              ) : (
                <p className="text-xs text-gray-500 italic">No key results yet</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200">
              {getInitials(currentObjective.owner)}
            </span>
            <span className="text-sm text-gray-700 font-medium ml-1">{currentObjective.owner}</span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setShowDetail(true); }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
          >
            <span>View Details</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showDetail && (
        <ObjectiveDetail 
          objective={currentObjective} 
          onClose={() => setShowDetail(false)} 
        />
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}