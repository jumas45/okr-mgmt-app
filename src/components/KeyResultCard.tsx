import React, { useState } from 'react';
import { MoreVertical, Edit, Trash2, MessageCircle, TrendingUp } from 'lucide-react';
import { KeyResult } from '../types';
import { useOKRData } from '../hooks/useOKRData';
import { getProgressBarColor } from '../utils/calculations';
import CheckInModal from './CheckInModal';

interface KeyResultCardProps {
  keyResult: KeyResult;
  objectiveId: string;
  onUpdate: (id: string, updates: Partial<KeyResult>) => void;
  onDelete: (id: string) => void;
  updatedAt?: string;
  owner?: string;
}

export default function KeyResultCard({ keyResult, objectiveId, onUpdate, onDelete, updatedAt, owner }: KeyResultCardProps) {
  const { objectives, updateTrigger } = useOKRData();
  const [showMenu, setShowMenu] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    title: keyResult.title,
    currentValue: keyResult.currentValue
  });

  // Get the current key result data to ensure we have the latest state
  const currentKeyResult = React.useMemo(() => {
    const currentObjective = objectives.find(obj => obj.id === objectiveId);
    return currentObjective?.keyResults.find(kr => kr.id === keyResult.id) || keyResult;
  }, [objectives, objectiveId, keyResult.id, updateTrigger]);

  // Update edit values when key result changes
  React.useEffect(() => {
    setEditValues({
      title: currentKeyResult.title,
      currentValue: currentKeyResult.currentValue
    });
  }, [currentKeyResult.title, currentKeyResult.currentValue]);

  const progressColor = getProgressBarColor(currentKeyResult.progress);
  
  const formatValue = (value: number) => {
    if (currentKeyResult.type === 'boolean') {
      return value === currentKeyResult.targetValue ? 'Yes' : 'No';
    }
    if (currentKeyResult.type === 'percentage') {
      return `${value}%`;
    }
    return `${value}${currentKeyResult.unit || ''}`;
  };

  const handleSave = () => {
    onUpdate(currentKeyResult.id, editValues);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this key result?')) {
      onDelete(currentKeyResult.id);
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editValues.title}
                onChange={(e) => setEditValues(prev => ({ ...prev, title: e.target.value }))}
                className="w-full font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 text-sm"
                autoFocus
              />
            ) : (
              <h4 className="font-medium text-gray-900 text-sm">{currentKeyResult.title}</h4>
            )}
            {currentKeyResult.description && (
              <p className="text-xs text-gray-600 mt-1">{currentKeyResult.description}</p>
            )}
          </div>
          
          <div className="relative ml-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[100px]">
                <button
                  onClick={() => {
                    setIsEditing(!isEditing);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Edit className="w-3 h-3" />
                  <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 text-red-600 flex items-center space-x-2"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {updatedAt && owner && (
          <div className="text-xs text-gray-400 mb-2">
            Last updated: {new Date(updatedAt).toLocaleString()} by {owner}
          </div>
        )}

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Progress</span>
            <span className="text-xs font-semibold text-gray-900">{currentKeyResult.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${currentKeyResult.progress}%` }}
            />
          </div>
        </div>

        {/* Values */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <div>
            <span className="text-gray-500">Current: </span>
            {isEditing ? (
              <input
                type="number"
                value={editValues.currentValue}
                onChange={(e) => setEditValues(prev => ({ ...prev, currentValue: Number(e.target.value) }))}
                className="w-16 border border-gray-300 rounded px-1 py-0.5"
              />
            ) : (
              <span className="font-medium text-gray-900">{formatValue(currentKeyResult.currentValue)}</span>
            )}
          </div>
          <div>
            <span className="text-gray-500">Target: </span>
            <span className="font-medium text-gray-900">{formatValue(currentKeyResult.targetValue)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCheckIn(true)}
              className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center space-x-1"
            >
              <TrendingUp className="w-3 h-3" />
              <span>Check-in</span>
            </button>
            {currentKeyResult.checkIns.length > 0 && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <MessageCircle className="w-3 h-3" />
                <span>{currentKeyResult.checkIns.length} updates</span>
              </div>
            )}
          </div>
          
          {isEditing && (
            <button
              onClick={handleSave}
              className="text-green-600 hover:text-green-700 text-xs font-medium"
            >
              Save
            </button>
          )}
        </div>
      </div>

      {showCheckIn && (
        <CheckInModal
          keyResult={currentKeyResult}
          objectiveId={objectiveId}
          onClose={() => setShowCheckIn(false)}
        />
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}