import React, { useState, useRef, useEffect } from 'react';
import { X, TrendingUp, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { KeyResult } from '../types';
import { useOKRData } from '../hooks/useOKRData';
import toast from 'react-hot-toast';

interface CheckInModalProps {
  keyResult: KeyResult;
  objectiveId: string;
  onClose: () => void;
}

export default function CheckInModal({ keyResult, objectiveId, onClose }: CheckInModalProps) {
  const { addCheckIn, settings, objectives, updateTrigger } = useOKRData();
  const [formData, setFormData] = useState<{
    value: number;
    comment: string;
    confidence: number;
  }>({
    value: keyResult.currentValue,
    comment: '',
    confidence: 70
  });
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

  // Get the current key result data to ensure we have the latest state
  const currentKeyResult = React.useMemo(() => {
    const currentObjective = objectives.find(obj => obj.id === objectiveId);
    return currentObjective?.keyResults.find(kr => kr.id === keyResult.id) || keyResult;
  }, [objectives, objectiveId, keyResult.id, updateTrigger]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Required field validation
    if (typeof formData.value !== 'number' || isNaN(formData.value) || formData.value === null) {
      toast.error('Please enter a value for the check-in.');
      setLoading(false);
      return;
    }
    addCheckIn(objectiveId, currentKeyResult.id, {
      keyResultId: currentKeyResult.id,
      value: formData.value,
      comment: formData.comment,
      confidence: formData.confidence,
      date: new Date().toISOString(),
      author: settings.defaultUser.name
    });
    toast.success('Check-in added!');
    setLoading(false);
    onClose();
  };

  const formatValue = (value: number) => {
    if (currentKeyResult.type === 'boolean') {
      return value === currentKeyResult.targetValue ? 'Yes' : 'No';
    }
    if (currentKeyResult.type === 'percentage') {
      return `${value}%`;
    }
    return `${value}${currentKeyResult.unit || ''}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-600';
    if (confidence >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-modal-title"
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 opacity-100 animate-fade-in"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" aria-hidden="true" />
            <h2 id="checkin-modal-title" className="text-xl font-semibold text-gray-900">Check-in</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-2xl"
            style={{ lineHeight: 0 }}
            aria-label="Close"
          >
            <X className="w-7 h-7" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">{currentKeyResult.title}</h3>
            <div className="text-sm text-gray-600">
              <span>Target: {formatValue(currentKeyResult.targetValue)}</span>
              <span className="mx-2">•</span>
              <span>Current: {formatValue(currentKeyResult.currentValue)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {currentKeyResult.type === 'boolean' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, value: 0 }))}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.value === 0
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, value: currentKeyResult.targetValue }))}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.value === currentKeyResult.targetValue
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Value
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${(typeof formData.value !== 'number' || isNaN(formData.value)) ? 'border-red-500' : 'border-gray-300'}`}
                    step={currentKeyResult.type === 'percentage' ? 1 : 'any'}
                    min={currentKeyResult.type === 'percentage' ? 0 : undefined}
                    max={currentKeyResult.type === 'percentage' ? 100 : undefined}
                  />
                  {(typeof formData.value !== 'number' || isNaN(formData.value)) && (
                    <AlertCircle className="absolute right-3 top-2 text-red-500 w-5 h-5" />
                  )}
                </div>
                {(typeof formData.value !== 'number' || isNaN(formData.value)) && (
                  <span className="text-red-600 text-xs flex items-center mt-1"><AlertCircle className="w-4 h-4 mr-1" /> Value required</span>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Level: <span className={`font-semibold ${getConfidenceColor(formData.confidence)}`}>{formData.confidence}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={formData.confidence}
                onChange={(e) => setFormData(prev => ({ ...prev, confidence: Number(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Comment
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  rows={3}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What progress have you made? Any blockers or insights?"
                />
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Submit Check-in
              </button>
            </div>
          </form>

          {/* Recent Check-ins */}
          {currentKeyResult.checkIns.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Updates</h4>
              <div className="space-y-3 max-h-32 overflow-y-auto">
                {currentKeyResult.checkIns.slice(-3).reverse().map(checkIn => (
                  <div key={checkIn.id} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{formatValue(checkIn.value)}</span>
                      <span className="text-gray-500">{new Date(checkIn.date).toLocaleDateString()}</span>
                    </div>
                    {checkIn.comment && (
                      <p className="text-gray-600 text-xs">{checkIn.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}