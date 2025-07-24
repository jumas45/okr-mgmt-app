import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useOKRData } from '../hooks/useOKRData';
import { OKRLevel, Objective, Quarter } from '../types';
import toast from 'react-hot-toast';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingLabelTextarea from './FloatingLabelTextarea';
// Removed FloatingLabelSelect
import SearchableDropdown from './SearchableDropdown';

interface CreateObjectiveModalProps {
  onClose: () => void;
  initialLevel?: import('../types').OKRLevel;
}

export default function CreateObjectiveModal({ onClose, initialLevel }: CreateObjectiveModalProps) {
  const { addObjective, settings, objectives, currentWorkspace } = useOKRData();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: (initialLevel ?? '') as '' | OKRLevel,
    owner: settings.defaultUser.name,
    tags: [] as string[],
    tagInput: '',
    parentId: '' as string,
    startQuarter: '' as '' | Quarter, // No default
    startYear: '' as '' | number, // No default
    endQuarter: '' as '' | Quarter, // No default
    endYear: '' as '' | number, // No default
  });

  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap and Esc-to-close
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

  // When start changes, update end if both start fields are filled
  function handleStartChange(field: 'startQuarter' | 'startYear', value: string | number) {
    setFormData(prev => {
      const newStartQuarter = field === 'startQuarter' ? value as Quarter : prev.startQuarter;
      const newStartYear = field === 'startYear' ? Number(value) : prev.startYear;
      let endQuarter = prev.endQuarter;
      let endYear = prev.endYear;
      // If both start fields are filled, auto-fill end fields
      if (newStartQuarter && newStartYear) {
        endQuarter = newStartQuarter;
        endYear = newStartYear;
      }
      return {
        ...prev,
        [field]: value,
        endQuarter,
        endYear,
      };
    });
  }

  // Filter valid parent objectives based on level and timeline rules
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
  const validParents = objectives.filter((obj: Objective) => {
    if (!formData.level) return false;
    if (obj.workspaceId !== currentWorkspace) return false;
    if (obj.id === formData.parentId) return false;
    // Level logic
    if (formData.level === 'team' && obj.level !== 'company') return false;
    if (formData.level === 'individual' && obj.level !== 'team') return false;
    if (formData.level === 'company') return false; // company cannot have a parent
    // Timeline logic (only if all fields are filled)
    if (formData.startQuarter && formData.startYear && formData.endQuarter && formData.endYear) {
      if (!isBeforeOrEqual(obj.startYear, obj.startQuarter, formData.startYear, formData.startQuarter)) return false;
      if (!isAfterOrEqual(obj.endYear, obj.endQuarter, formData.endYear, formData.endQuarter)) return false;
    }
    return true;
  });

  // Compute all unique tags in the workspace
  const allTags = Array.from(new Set(objectives.flatMap(obj => obj.tags))).filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Required field validation
    if (!formData.title.trim() || !formData.owner.trim() || !formData.level || !formData.startQuarter || !formData.startYear || !formData.endQuarter || !formData.endYear) {
      toast.error('Please fill in all required fields.');
      return;
    }
    // Validation: End must not be before start
    if (
      formData.endYear < formData.startYear ||
      (formData.endYear === formData.startYear && ['Q1','Q2','Q3','Q4'].indexOf(formData.endQuarter) < ['Q1','Q2','Q3','Q4'].indexOf(formData.startQuarter))
    ) {
      toast.error('End quarter/year must not be before start quarter/year.');
      return;
    }
    addObjective({
      title: formData.title,
      description: formData.description,
      level: formData.level,
      owner: formData.owner,
      startQuarter: formData.startQuarter,
      startYear: formData.startYear,
      endQuarter: formData.endQuarter,
      endYear: formData.endYear,
      status: 'not-started',
      keyResults: [],
      tags: formData.tags,
      archived: false,
      parentId: formData.parentId || undefined,
      workspaceId: currentWorkspace
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-objective-modal-title"
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 opacity-100 animate-fade-in"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="create-objective-modal-title" className="text-xl font-semibold text-gray-900">Create New Objective</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-2xl"
            style={{ lineHeight: 0 }}
            aria-label="Close"
          >
            <X className="w-7 h-7" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="mb-4">
            <FloatingLabelInput
              label="Title"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              error={!formData.title.trim() ? 'Required' : undefined}
            />
          </div>

          <div>
            <FloatingLabelTextarea
              label="Description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="mb-4">
            <FloatingLabelInput
              label="Owner"
              value={formData.owner}
              onChange={e => setFormData(prev => ({ ...prev, owner: e.target.value }))}
              required
              error={!formData.owner.trim() ? 'Required' : undefined}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Level <span className="text-red-600">*</span></label>
            <select
              value={formData.level}
              onChange={e => setFormData(prev => ({ ...prev, level: e.target.value as OKRLevel }))}
              required
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 ${!formData.level ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select level</option>
              <option value="company">Company</option>
              <option value="team">Team</option>
              <option value="individual">Individual</option>
            </select>
            {!formData.level && <span className="text-red-600 text-xs mt-1 block">Required</span>}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Quarter <span className="text-red-600">*</span></label>
              <select
                value={formData.startQuarter}
                onChange={e => handleStartChange('startQuarter', e.target.value)}
                required
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 ${!formData.startQuarter ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select quarter</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
              {!formData.startQuarter && <span className="text-red-600 text-xs mt-1 block">Required</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Year <span className="text-red-600">*</span></label>
              <select
                value={formData.startYear}
                onChange={e => handleStartChange('startYear', Number(e.target.value))}
                required
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 ${!formData.startYear ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="" disabled>Select year...</option>
                {Array.from({ length: 6 }).map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
              {!formData.startYear && <span className="text-red-600 text-xs mt-1 block">Required</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">End Quarter <span className="text-red-600">*</span></label>
              <select
                value={formData.endQuarter}
                onChange={e => setFormData(prev => ({ ...prev, endQuarter: e.target.value as Quarter }))}
                required
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 ${!formData.endQuarter ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select quarter</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
              {!formData.endQuarter && <span className="text-red-600 text-xs mt-1 block">Required</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Year <span className="text-red-600">*</span></label>
              <select
                value={formData.endYear}
                onChange={e => setFormData(prev => ({ ...prev, endYear: Number(e.target.value) }))}
                required
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 ${!formData.endYear ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="" disabled>Select year...</option>
                {Array.from({ length: 6 }).map((_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
              {!formData.endYear && <span className="text-red-600 text-xs mt-1 block">Required</span>}
            </div>
          </div>
          {/* Validation: End must not be before start */}
          {((formData.endYear < formData.startYear) || (formData.endYear === formData.startYear && ['Q1','Q2','Q3','Q4'].indexOf(formData.endQuarter) < ['Q1','Q2','Q3','Q4'].indexOf(formData.startQuarter))) && (
            <div className="text-red-600 text-xs mt-1">End quarter/year must not be before start quarter/year.</div>
          )}

          {/* Parent Objective Selector */}
          {(formData.level === 'company' || formData.level === 'team' || formData.level === 'individual') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Objective (optional)</label>
              <SearchableDropdown
                label=""
                value={formData.parentId}
                onChange={val => setFormData(prev => ({ ...prev, parentId: val }))}
                options={[
                  { value: '', label: 'None' },
                  ...validParents.map(parent => ({ value: parent.id, label: parent.title }))
                ]}
                placeholder="Select parent objective..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <SearchableDropdown
              label=""
              value=""
              onChange={tag => {
                if (tag && !formData.tags.includes(tag)) {
                  setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                }
              }}
              options={allTags.filter(tag => !formData.tags.includes(tag)).map(tag => ({ value: tag, label: tag }))}
              placeholder="Type to search or add..."
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map(tag => (
                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">
                  {tag}
                  <button
                    type="button"
                    className="ml-1 text-blue-600 hover:text-red-600"
                    onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Objective
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}