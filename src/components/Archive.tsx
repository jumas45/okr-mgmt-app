import { useState } from 'react';
import { Search, Archive as ArchiveIcon, RotateCcw, Trash2, X, Building2, Users2, User } from 'lucide-react';
import { useOKRData } from '../hooks/useOKRData';
import { getStatusColor, getProgressBarColor } from '../utils/calculations';
import type { Objective, KeyResult } from '../types';

// Simple Tooltip component
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
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

export default function Archive() {
  const { getArchivedObjectives, restoreObjective, deleteObjective } = useOKRData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState<{id: string}|null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{id: string}|null>(null);
  
  const archivedObjectives = getArchivedObjectives();
  
  const filteredObjectives = archivedObjectives.filter((obj: Objective) =>
    obj.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRestore = (id: string) => {
    setShowRestoreModal({id});
  };

  const handleDelete = (id: string) => {
    setShowDeleteModal({id});
  };

  const levelIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    company: { icon: <Building2 className="w-4 h-4" />, color: 'text-blue-600' },
    team: { icon: <Users2 className="w-4 h-4" />, color: 'text-green-600' },
    individual: { icon: <User className="w-4 h-4" />, color: 'text-purple-600' },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Archived OKRs</h2>
        <p className="text-gray-600">
          View and manage your completed or archived objectives
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search archived objectives..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredObjectives.length > 0 ? (
        <div className="space-y-4">
          {filteredObjectives.map((objective: Objective) => {
            const statusColor = getStatusColor(objective.status);
            const progressColor = getProgressBarColor(objective.progress);
            
            return (
              <div key={objective.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center justify-center mr-2 align-middle ${levelIcons[objective.level]?.color || ''}`} title={objective.level.charAt(0).toUpperCase() + objective.level.slice(1)}>
                        {levelIcons[objective.level]?.icon}
                      </span>
                      <span className="text-xs font-medium">
                        {objective.level.charAt(0).toUpperCase() + objective.level.slice(1)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                        {objective.status.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                      <span className="text-xs text-gray-500">
                        {objective.quarter} {objective.year}
                      </span>
                    </div>
                    
                    <Tooltip text={objective.title}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate" style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{objective.title}</h3>
                    </Tooltip>
                    {objective.description && (
                      <Tooltip text={objective.description}>
                        <p className="text-gray-600 text-sm mb-4 truncate" style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{objective.description}</p>
                      </Tooltip>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-xs text-gray-500">Final Progress</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${progressColor}`}
                              style={{ width: `${objective.progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-10">{objective.progress}%</span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-xs text-gray-500">Key Results</span>
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          {objective.keyResults.length} total
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-xs text-gray-500">Owner</span>
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          {objective.owner}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Tooltip text="Restore objective">
                      <button
                        onClick={() => handleRestore(objective.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        aria-label="Restore objective"
                      >
                        <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Delete permanently">
                      <button
                        onClick={() => handleDelete(objective.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Delete objective permanently"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Key Results Summary */}
                {objective.keyResults.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Key Results Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {objective.keyResults.slice(0, 4).map((kr: KeyResult) => (
                        <div key={kr.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-xs text-gray-700 truncate flex-1">{kr.title}</span>
                          <span className="text-xs font-medium text-gray-900 ml-2">{kr.progress}%</span>
                        </div>
                      ))}
                    </div>
                    {objective.keyResults.length > 4 && (
                      <p className="text-xs text-gray-500 mt-2">
                        +{objective.keyResults.length - 4} more key results
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <ArchiveIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {archivedObjectives.length === 0 ? 'No archived objectives' : 'No objectives found'}
          </h3>
          <p className="text-gray-600">
            {archivedObjectives.length === 0 
              ? 'Objectives you archive will appear here for future reference.'
              : 'Try adjusting your search to find what you\'re looking for.'
            }
          </p>
        </div>
      )}

      {/* Modals */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative shadow-lg" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowRestoreModal(null)}>
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Restore Objective</h3>
            <p className="mb-4 text-gray-700">Are you sure you want to restore this objective?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowRestoreModal(null)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => { restoreObjective(showRestoreModal.id); setShowRestoreModal(null); }}>Restore</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative shadow-lg" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowDeleteModal(null)}>
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Delete Objective</h3>
            <p className="mb-4 text-gray-700">Are you sure you want to permanently delete this objective? This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowDeleteModal(null)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={() => { deleteObjective(showDeleteModal.id); setShowDeleteModal(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}