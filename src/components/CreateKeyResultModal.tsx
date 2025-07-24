import React, { useState, useRef, useEffect } from 'react';
import type { KeyResult } from '../types';
import { X, Loader2 } from 'lucide-react';
import { useOKRData } from '../hooks/useOKRData';
import { KeyResultType, Objective } from '../types';
import toast from 'react-hot-toast';

interface CreateKeyResultModalProps {
  objectiveId: string;
  keyResult?: KeyResult;
  onClose: () => void;
  onSave?: (kr: KeyResult) => void;
}

export default function CreateKeyResultModal({ objectiveId, keyResult, onClose, onSave }: CreateKeyResultModalProps) {
  const { addKeyResult, settings, objectives } = useOKRData();
  const [formData, setFormData] = useState({
    title: keyResult?.title || '',
    description: keyResult?.description || '',
    type: keyResult?.type || 'number' as KeyResultType,
    startValue: keyResult?.startValue ?? 0,
    targetValue: keyResult?.targetValue ?? 100,
    currentValue: keyResult?.currentValue ?? 0,
    unit: keyResult?.unit || '',
    owner: keyResult?.owner || settings.defaultUser.name
  });
  useEffect(() => {
    if (keyResult) {
      setFormData({
        title: keyResult.title,
        description: keyResult.description || '',
        type: keyResult.type,
        startValue: keyResult.startValue,
        targetValue: keyResult.targetValue,
        currentValue: keyResult.currentValue,
        unit: keyResult.unit || '',
        owner: keyResult.owner
      });
    }
  }, [keyResult]);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const parentObjective = objectives.find((obj: Objective) => obj.id === objectiveId);
    const workspaceId = parentObjective?.workspaceId || '';
    // Required field validation
    if (!formData.title.trim()) {
      toast.error('Please enter a title for the key result.');
      setLoading(false);
      return;
    }
    if (keyResult) {
      // Editing existing
      const updatedKR: KeyResult = {
        ...keyResult,
        ...formData,
        updatedAt: new Date().toISOString(),
      };
      onSave?.(updatedKR);
      toast.success('Key result updated!');
      setLoading(false);
      onClose();
      return;
    }
    // Creating new
    addKeyResult(objectiveId, {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      startValue: formData.startValue,
      targetValue: formData.targetValue,
      currentValue: formData.currentValue,
      unit: formData.unit,
      owner: formData.owner,
      status: 'not-started',
      workspaceId,
    });
    toast.success('Key result created!');
    setLoading(false);
    onClose();
  };

  const getPlaceholderText = () => {
    switch (formData.type) {
      case 'percentage':
        return 'e.g., Increase customer satisfaction to 85%';
      case 'number':
        return 'e.g., Acquire 500 new customers';
      case 'boolean':
        return 'e.g., Launch new product feature';
      default:
        return 'Describe your key result...';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-kr-modal-title"
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 opacity-100 animate-fade-in"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="create-kr-modal-title" className="text-xl font-semibold text-gray-900">{keyResult ? 'Edit Key Result' : 'Add Key Result'}</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-600">*</span></label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder={getPlaceholderText()}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 ${!formData.title.trim() ? 'border-red-500' : 'border-gray-300'}`}
            />
            {!formData.title.trim() && <span className="text-red-600 text-xs mt-1 block">Required</span>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="Additional details about this key result..."
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 border-gray-300"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={e => setFormData(prev => ({
                ...prev,
                type: e.target.value as KeyResultType,
                startValue: e.target.value === 'boolean' ? 0 : prev.startValue,
                targetValue: e.target.value === 'boolean' ? 1 : e.target.value === 'percentage' ? 100 : prev.targetValue
              }))}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 border-gray-300"
            >
              <option value="number">Number</option>
              <option value="percentage">Percentage</option>
              <option value="boolean">Yes/No</option>
            </select>
          </div>

          {formData.type !== 'boolean' && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                <input
                  type="number"
                  value={formData.startValue}
                  onChange={e => setFormData(prev => ({ ...prev, startValue: Number(e.target.value) }))}
                  step={formData.type === 'percentage' ? 1 : 'any'}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target <span className="text-red-600">*</span></label>
                <input
                  type="number"
                  value={formData.targetValue}
                  onChange={e => setFormData(prev => ({ ...prev, targetValue: Number(e.target.value) }))}
                  required
                  step={formData.type === 'percentage' ? 1 : 'any'}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 ${!formData.targetValue && formData.targetValue !== 0 ? 'border-red-500' : 'border-gray-300'}`}
                />
                {!formData.targetValue && formData.targetValue !== 0 && <span className="text-red-600 text-xs mt-1 block">Required</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current</label>
                <input
                  type="number"
                  value={formData.currentValue}
                  onChange={e => setFormData(prev => ({ ...prev, currentValue: Number(e.target.value) }))}
                  step={formData.type === 'percentage' ? 1 : 'any'}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 border-gray-300"
                />
              </div>
            </div>
          )}

          {formData.type === 'number' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit (optional)</label>
              <input
                type="text"
                value={formData.unit}
                onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="e.g., users, $, tasks, etc."
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 border-gray-300"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
            <input
              type="text"
              value={formData.owner}
              onChange={e => setFormData(prev => ({ ...prev, owner: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:shadow-lg transition-all duration-200 border-gray-300"
            />
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {keyResult ? 'Save Changes' : 'Create Key Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}