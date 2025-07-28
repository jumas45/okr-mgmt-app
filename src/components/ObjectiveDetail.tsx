import React, { useState, useRef, useEffect } from 'react';
import { X, Edit, Save, Trash2, Building2, Users2, User, Pause, XCircle } from 'lucide-react';
import { Objective, Quarter, KeyResult } from '../types';
import { useOKRData } from '../hooks/useOKRData';
import { getStatusColor } from '../utils/calculations';
import CreateKeyResultModal from './CreateKeyResultModal';
import StatusManagementModal from './StatusManagementModal';
import toast from 'react-hot-toast';
import CheckInModal from './CheckInModal';
import SearchableDropdown from './SearchableDropdown';

interface ObjectiveDetailProps {
  objective: Objective;
  onClose: () => void;
}

export default function ObjectiveDetail({ objective, onClose }: ObjectiveDetailProps) {
  const { updateObjective, objectives, duplicateObjective, settings, deleteObjective, restoreObjective } = useOKRData();
  const [showParentDetail, setShowParentDetail] = useState<Objective | null>(null);
  const [showChildDetail, setShowChildDetail] = useState<Objective | null>(null);
  const [showCreateKR, setShowCreateKR] = useState<{mode: 'add'} | {mode: 'edit', keyResult: KeyResult} | false>(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: objective.title,
    description: objective.description || '',
    owner: objective.owner,
    parentId: objective.parentId || '',
    startQuarter: objective.startQuarter,
    startYear: objective.startYear,
    endQuarter: objective.endQuarter,
    endYear: objective.endYear,
  });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [dupQuarter, setDupQuarter] = useState<Quarter>(settings.currentQuarter);
  const [dupYear, setDupYear] = useState<number>(settings.currentYear);
  const [editTags, setEditTags] = useState<string[]>(objective.tags || []);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOnHoldModal, setShowOnHoldModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [showCheckIn, setShowCheckIn] = useState<KeyResult | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [showStatusManagement, setShowStatusManagement] = useState(false);

  // Focus trap and Esc-to-close for main modal
  useEffect(() => {
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && focusable && focusable.length > 1) {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    first?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Get the current objective data to ensure we have the latest state
  const currentObjective = React.useMemo(() => 
    objectives.find(obj => obj.id === objective.id) || objective,
    [objectives, objective]
  );
  // Find parent and children
  const parentObjective = currentObjective.parentId ? objectives.find(obj => obj.id === currentObjective.parentId) : null;
  // Helper: compare (year, quarter) tuples
  function isAfterOrEqual(y1: number, q1: Quarter, y2: number, q2: Quarter) {
    if (y1 > y2) return true;
    if (y1 === y2) return ['Q1','Q2','Q3','Q4'].indexOf(q1) >= ['Q1','Q2','Q3','Q4'].indexOf(q2);
    return false;
  }

  // Update edit data when objective changes
  React.useEffect(() => {
    setEditData({
      title: currentObjective.title,
      description: currentObjective.description || '',
      owner: currentObjective.owner,
      parentId: currentObjective.parentId || '',
      startQuarter: currentObjective.startQuarter,
      startYear: currentObjective.startYear,
      endQuarter: currentObjective.endQuarter,
      endYear: currentObjective.endYear,
    });
    setEditTags(currentObjective.tags || []);
  }, [currentObjective.title, currentObjective.description, currentObjective.owner, currentObjective.parentId, currentObjective.startQuarter, currentObjective.startYear, currentObjective.endQuarter, currentObjective.endYear, currentObjective.tags]);

  const handleSave = () => {
    if (!editData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!editData.owner.trim()) {
      toast.error('Owner is required');
      return;
    }
    if (!editData.startQuarter || !editData.endQuarter) {
      toast.error('Start and end quarters are required');
      return;
    }
    if (!editData.startYear || !editData.endYear) {
      toast.error('Start and end years are required');
      return;
    }
    if (!isAfterOrEqual(editData.endYear, editData.endQuarter, editData.startYear, editData.startQuarter)) {
      toast.error('End date must be after start date');
      return;
    }
    updateObjective(currentObjective.id, {
      ...currentObjective,
      title: editData.title.trim(),
      description: editData.description.trim(),
      owner: editData.owner.trim(),
      parentId: editData.parentId || undefined,
      startQuarter: editData.startQuarter,
      startYear: editData.startYear,
      endQuarter: editData.endQuarter,
      endYear: editData.endYear,
      tags: editTags,
    });
    setIsEditing(false);
    toast.success('Objective updated successfully!');
  };

  const handleDuplicate = () => {
    duplicateObjective(currentObjective.id, dupQuarter, dupYear);
    setShowDuplicateModal(false);
    toast.success('Objective duplicated successfully!');
  };

  function getDescendantsWithLevels(objId: string, allObjs: Objective[]): Objective[] {
    const descendants: Objective[] = [];
    function findChildren(id: string) {
      const children = allObjs.filter(obj => obj.parentId === id);
      descendants.push(...children);
      children.forEach(child => findChildren(child.id));
    }
    findChildren(objId);
    return descendants;
  }

  function handleDeleteWithChildren() {
    // Delete all descendants first, then the objective itself
    allDescendants.forEach(desc => deleteObjective(desc.id));
    deleteObjective(currentObjective.id);
    setShowDeleteModal(false);
    onClose();
  }

  // Status change handlers
  function handleOnHoldWithChildren() {
    // Set all descendants to on-hold first, then the objective itself
    allDescendants.forEach(desc => {
      updateObjective(desc.id, { status: 'on-hold' });
    });
    updateObjective(currentObjective.id, { status: 'on-hold' });
    setShowOnHoldModal(false);
    toast.success('Objective and children set to On Hold!');
  }

  function handleCancelWithChildren() {
    // Set all descendants to cancelled first, then the objective itself
    allDescendants.forEach(desc => {
      updateObjective(desc.id, { status: 'cancelled' });
    });
    updateObjective(currentObjective.id, { status: 'cancelled' });
    setShowCancelModal(false);
    toast.success('Objective and children cancelled!');
  }

  const handleRequestClose = () => {
    if (window.isEditing) {
      setShowUnsavedModal(true);
      return;
    }
    onClose();
  };

  const levelIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    company: { icon: <Building2 className="w-7 h-7" />, color: 'text-blue-600' },
    team: { icon: <Users2 className="w-7 h-7" />, color: 'text-green-600' },
    individual: { icon: <User className="w-7 h-7" />, color: 'text-purple-600' },
  };

  // Calculate descendants for status change modals
  const allDescendants = React.useMemo(() => {
    return getDescendantsWithLevels(currentObjective.id, objectives);
  }, [currentObjective.id, objectives]);
  const companyCount = allDescendants.filter(o => o.level === 'company').length;
  const teamCount = allDescendants.filter(o => o.level === 'team').length;
  const individualCount = allDescendants.filter(o => o.level === 'individual').length;

  // Status color and text
  const statusColor = getStatusColor(currentObjective.status);
  const status = currentObjective.status;

  return (
    <>
      <div
        className="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center p-4 z-50"
        onClick={handleRequestClose}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="objective-detail-modal-title"
          tabIndex={-1}
          className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${
            currentObjective.level === 'company' ? 'bg-blue-50' :
            currentObjective.level === 'team' ? 'bg-green-50' :
            'bg-purple-50'
          }`}>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center justify-center mr-3 align-middle ${levelIcons[currentObjective.level]?.color || ''}`} title={currentObjective.level.charAt(0).toUpperCase() + currentObjective.level.slice(1)}>
                  {levelIcons[currentObjective.level]?.icon}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                  {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                {/* Status Management button */}
                <button
                  onClick={() => setShowStatusManagement(true)}
                  className="ml-2 px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                  title="Manage Status"
                >
                  Status
                </button>
              </div>
              {/* Unarchive button for archived objectives */}
              {currentObjective.archived && (
                <button
                  className="ml-4 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs"
                  onClick={() => setShowUnarchiveModal(true)}
                >
                  Unarchive
                </button>
              )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center space-x-1 rounded px-3 py-1 text-sm transition ${isEditing ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-400' : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400'}`}
            >
              {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              <span>{isEditing ? 'Cancel' : 'Edit'}</span>
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                className="flex items-center space-x-1 bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-400 rounded px-3 py-1 text-sm transition ml-2"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            )}
            {/* Status change buttons in edit mode */}
            {isEditing && currentObjective.status !== 'on-hold' && currentObjective.status !== 'cancelled' && (
              <>
                <button
                  onClick={() => setShowOnHoldModal(true)}
                  className="flex items-center space-x-1 bg-orange-600 text-white hover:bg-orange-700 focus:ring-2 focus:ring-orange-400 rounded px-3 py-1 text-sm transition ml-2"
                  title="Put On Hold"
                >
                  <Pause className="w-4 h-4" />
                  <span>On Hold</span>
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center space-x-1 bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-400 rounded px-3 py-1 text-sm transition ml-2"
                  title="Cancel Objective"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </>
            )}
            {/* Delete button */}
            {!isEditing && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center space-x-1 bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-400 rounded px-3 py-1 text-sm transition ml-2"
                title="Delete Objective"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
            </div>
            <button
              onClick={() => {
                if (window.isEditing) {
                  setShowUnsavedModal(true);
                } else {
                  onClose();
                }
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
            {/* Objective Details Section */}
            <div className="mb-8">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  {/* Parent Objective Selector */}
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Parent Objective</label>
                    <SearchableDropdown
                      label=""
                      value={editData.parentId}
                      onChange={val => setEditData(prev => ({ ...prev, parentId: val }))}
                      options={[
                        { value: '', label: 'None' },
                        ...objectives.filter(obj => {
                          // Prevent self, descendants, and invalid levels/timelines
                          if (obj.id === currentObjective.id) return false;
                          // Prevent cycles: exclude all descendants
                          const isDescendant = (() => {
                            let stack = [currentObjective.id];
                            while (stack.length) {
                              const id = stack.pop();
                              if (obj.id === id) return true;
                              stack = stack.concat(objectives.filter(o => o.parentId === id).map(o => o.id));
                            }
                            return false;
                          })();
                          if (isDescendant) return false;
                          // Level rules
                          if (currentObjective.level === 'team' && obj.level !== 'company') return false;
                          if (currentObjective.level === 'individual' && obj.level !== 'team') return false;
                          if (currentObjective.level === 'company') return false;
                          // Timeline rules
                          if (
                            obj.startYear > editData.startYear ||
                            (obj.startYear === editData.startYear && ['Q1','Q2','Q3','Q4'].indexOf(obj.startQuarter) > ['Q1','Q2','Q3','Q4'].indexOf(editData.startQuarter))
                          ) return false;
                          if (
                            obj.endYear < editData.endYear ||
                            (obj.endYear === editData.endYear && ['Q1','Q2','Q3','Q4'].indexOf(obj.endQuarter) < ['Q1','Q2','Q3','Q4'].indexOf(editData.endQuarter))
                          ) return false;
                          return true;
                        }).map(parent => ({ value: parent.id, label: parent.title }))
                      ]}
                      placeholder="Select parent objective..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Title</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editData.title}
                      onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Owner</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editData.owner}
                      onChange={e => setEditData(prev => ({ ...prev, owner: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editData.description}
                      onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Quarter</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editData.startQuarter}
                      onChange={e => setEditData(prev => ({ ...prev, startQuarter: e.target.value as Quarter }))}
                      required
                    >
                      <option value="">Select quarter</option>
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Year</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editData.startYear}
                      onChange={e => setEditData(prev => ({ ...prev, startYear: Number(e.target.value) }))}
                      required
                    >
                      <option value="">Select year</option>
                      {Array.from({ length: 6 }).map((_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Quarter</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editData.endQuarter}
                      onChange={e => setEditData(prev => ({ ...prev, endQuarter: e.target.value as Quarter }))}
                      required
                    >
                      <option value="">Select quarter</option>
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Year</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editData.endYear}
                      onChange={e => setEditData(prev => ({ ...prev, endYear: Number(e.target.value) }))}
                      required
                    >
                      <option value="">Select year</option>
                      {Array.from({ length: 6 }).map((_, i) => {
                        const year = new Date().getFullYear() - 2 + i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Tags</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editTags.join(', ')}
                      onChange={e => setEditTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                      placeholder="Comma-separated tags"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  {/* Parent Objective Display */}
                  <div className="md:col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Parent Objective</div>
                    {parentObjective ? (
                      <button
                        className="text-blue-600 hover:underline text-sm font-medium"
                        onClick={() => setShowParentDetail(parentObjective)}
                        type="button"
                      >
                        {parentObjective.title}
                      </button>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Title</div>
                    <div className="text-base font-semibold text-gray-900">{currentObjective.title}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Owner</div>
                    <div className="text-gray-700">{currentObjective.owner}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Description</div>
                    <div className="text-gray-700 whitespace-pre-line">{currentObjective.description || <span className="text-gray-400">No description</span>}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Start Quarter</div>
                    <div className="text-gray-700">{currentObjective.startQuarter}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Start Year</div>
                    <div className="text-gray-700">{currentObjective.startYear}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">End Quarter</div>
                    <div className="text-gray-700">{currentObjective.endQuarter}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">End Year</div>
                    <div className="text-gray-700">{currentObjective.endYear}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {currentObjective.tags && currentObjective.tags.length > 0 ? (
                        currentObjective.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium border border-blue-200">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">No tags</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Overall Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">Overall Progress</span>
                <span className="font-bold text-xl text-gray-900">{currentObjective.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full transition-all duration-300" style={{ width: `${currentObjective.progress}%` }} />
              </div>
            </div>
            {/* Key Results List - Card Style */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Key Results ({currentObjective.keyResults.length})</h3>
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  onClick={() => setShowCreateKR({mode: 'add'})}
                  type="button"
                >
                  + Add Key Result
                </button>
              </div>
              {currentObjective.keyResults.length === 0 ? (
                <div className="text-gray-500 italic">No key results yet.</div>
              ) : (
                <div className="space-y-4">
                  {currentObjective.keyResults.map(kr => (
                    <div key={kr.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="font-semibold text-gray-900 mb-1">{kr.title}</div>
                      <div className="text-xs text-gray-500 mb-2">Progress</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${kr.progress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span>Current: <span className="font-bold text-gray-900">{kr.currentValue}</span></span>
                        <span>Target: <span className="font-bold text-gray-900">{kr.targetValue}</span></span>
                      </div>
                      <div>
                        <button
                          className="text-blue-600 hover:underline text-xs font-medium"
                          onClick={() => setShowCheckIn(kr)}
                          type="button"
                        >Check-in</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {showCheckIn && (
              <CheckInModal
                keyResult={showCheckIn}
                objectiveId={currentObjective.id}
                onClose={() => setShowCheckIn(null)}
              />
            )}
          </div>
        </div>
      </div>

      {showCreateKR && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-50">
          <CreateKeyResultModal
            objectiveId={currentObjective.id}
            onClose={() => setShowCreateKR(false)}
          />
        </div>
      )}
      {/* Parent/Child Detail Modals */}
      {showParentDetail && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-50">
          <ObjectiveDetail objective={showParentDetail} onClose={() => setShowParentDetail(null)} />
        </div>
      )}
      {showChildDetail && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-50">
          <ObjectiveDetail objective={showChildDetail} onClose={() => setShowChildDetail(null)} />
        </div>
      )}
      {/* Duplicate Confirmation Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowDuplicateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 relative transform transition-all duration-300 scale-100 opacity-100 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Duplicate Objective</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quarter</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={dupQuarter}
                onChange={e => setDupQuarter(e.target.value as Quarter)}
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={dupYear}
                onChange={e => setDupYear(Number(e.target.value))}
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowDuplicateModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={handleDuplicate}>Duplicate</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 relative transform transition-all duration-300 scale-100 opacity-100 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-red-600 flex items-center"><Trash2 className="w-5 h-5 mr-2" /> Delete Objective</h3>
            <p className="mb-4 text-gray-700">Are you sure you want to delete this objective?</p>
            <div className="mb-4 text-sm text-gray-600">
              This will also delete:
              <ul className="list-disc ml-6 mt-1">
                <li><span className="font-bold">{companyCount}</span> Company</li>
                <li><span className="font-bold">{teamCount}</span> Team</li>
                <li><span className="font-bold">{individualCount}</span> Individual</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={handleDeleteWithChildren}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* On Hold Confirmation Modal */}
      {showOnHoldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowOnHoldModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 relative transform transition-all duration-300 scale-100 opacity-100 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-orange-600 flex items-center"><Pause className="w-5 h-5 mr-2" /> Put On Hold</h3>
            <p className="mb-4 text-gray-700">Are you sure you want to put this objective and its children on hold?</p>
            <div className="mb-4 text-sm text-gray-600">
              This will also put on hold:
              <ul className="list-disc ml-6 mt-1">
                <li><span className="font-bold">{companyCount}</span> Company</li>
                <li><span className="font-bold">{teamCount}</span> Team</li>
                <li><span className="font-bold">{individualCount}</span> Individual</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowOnHoldModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700" onClick={handleOnHoldWithChildren}>On Hold</button>
            </div>
          </div>
        </div>
      )}
      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 relative transform transition-all duration-300 scale-100 opacity-100 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-red-600 flex items-center"><XCircle className="w-5 h-5 mr-2" /> Cancel Objective</h3>
            <p className="mb-4 text-gray-700">Are you sure you want to cancel this objective and its children?</p>
            <div className="mb-4 text-sm text-gray-600">
              This will also cancel:
              <ul className="list-disc ml-6 mt-1">
                <li><span className="font-bold">{companyCount}</span> Company</li>
                <li><span className="font-bold">{teamCount}</span> Team</li>
                <li><span className="font-bold">{individualCount}</span> Individual</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowCancelModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={handleCancelWithChildren}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative shadow-lg" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => { setShowUnsavedModal(false); }}>
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Unsaved Changes</h3>
            <p className="mb-4 text-gray-700">You have unsaved changes. Closing will discard them. Continue?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => { setShowUnsavedModal(false); }}>Cancel</button>
              <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => { setShowUnsavedModal(false); onClose(); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {/* Unarchive Confirmation Modal */}
      {showUnarchiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative shadow-lg" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowUnarchiveModal(false)}>
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Unarchive Objective</h3>
            <p className="mb-4 text-gray-700">Are you sure you want to unarchive this objective?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={() => setShowUnarchiveModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600" onClick={() => { restoreObjective(currentObjective.id); toast.success('Objective unarchived!'); setShowUnarchiveModal(false); onClose(); }}>Unarchive</button>
            </div>
          </div>
        </div>
      )}
      {/* Status Management Modal */}
      {showStatusManagement && (
        <StatusManagementModal
          objective={currentObjective}
          onClose={() => setShowStatusManagement(false)}
        />
      )}
    </>
  );
}