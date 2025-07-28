import React from 'react';
import { X, AlertTriangle, Pause, XCircle, Play, RotateCcw } from 'lucide-react';
import { Objective, OKRStatus } from '../types';
import { useOKRData } from '../hooks/useOKRData';
import toast from 'react-hot-toast';
import { getStatusColor } from '../utils/calculations';

interface StatusManagementModalProps {
  objective: Objective;
  onClose: () => void;
}

export default function StatusManagementModal({ objective, onClose }: StatusManagementModalProps) {
  const { updateObjective, objectives } = useOKRData();
  const [selectedStatus, setSelectedStatus] = React.useState<OKRStatus | null>(null);
  const [showConfirmation, setShowConfirmation] = React.useState(false);

  const getStatusInfo = (status: OKRStatus) => {
    switch (status) {
      case 'on-hold':
        return {
          title: 'Put on Hold',
          description: 'This will pause the objective and all its child objectives. Progress will be preserved.',
          icon: <Pause className="w-6 h-6" />,
          color: 'text-orange-600 bg-orange-100',
          buttonColor: 'bg-orange-600 hover:bg-orange-700',
          confirmationMessage: `Are you sure you want to put "${objective.title}" and all its child objectives on hold?`
        };
      case 'cancelled':
        return {
          title: 'Cancel Objective',
          description: 'This will cancel the objective and all its child objectives. This action cannot be easily undone.',
          icon: <XCircle className="w-6 h-6" />,
          color: 'text-red-600 bg-red-100',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          confirmationMessage: `Are you sure you want to cancel "${objective.title}" and all its child objectives? This action cannot be easily undone.`
        };
      case 'not-started':
        return {
          title: 'Resume from Hold',
          description: 'This will resume the objective and all its child objectives from hold status.',
          icon: <Play className="w-6 h-6" />,
          color: 'text-blue-600 bg-blue-100',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          confirmationMessage: `Are you sure you want to resume "${objective.title}" and all its child objectives from hold?`
        };
      case 'on-track':
        return {
          title: 'Resurrect Objective',
          description: 'This will resurrect the objective and all its child objectives from cancelled status.',
          icon: <RotateCcw className="w-6 h-6" />,
          color: 'text-green-600 bg-green-100',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          confirmationMessage: `Are you sure you want to resurrect "${objective.title}" and all its child objectives from cancelled?`
        };
      default:
        return null;
    }
  };

  const getAvailableStatuses = (currentStatus: OKRStatus): OKRStatus[] => {
    switch (currentStatus) {
      case 'on-hold':
        return ['not-started', 'cancelled'];
      case 'cancelled':
        return ['on-track'];
      case 'not-started':
      case 'behind':
      case 'at-risk':
      case 'on-track':
      case 'completed':
        return ['on-hold', 'cancelled'];
      default:
        return [];
    }
  };

  const handleStatusChange = (newStatus: OKRStatus) => {
    setSelectedStatus(newStatus);
    setShowConfirmation(true);
  };

  const confirmStatusChange = () => {
    if (!selectedStatus) return;

    // Get all descendants of this objective
    const getDescendants = (objId: string): string[] => {
      const children = objectives.filter(obj => obj.parentId === objId);
      const descendants = [...children.map(child => child.id)];
      children.forEach(child => {
        descendants.push(...getDescendants(child.id));
      });
      return descendants;
    };

    const descendants = getDescendants(objective.id);
    const allAffectedIds = [objective.id, ...descendants];

    // Update all affected objectives
    allAffectedIds.forEach(id => {
      updateObjective(id, { status: selectedStatus });
    });

    const statusInfo = getStatusInfo(selectedStatus);
    if (statusInfo) {
      toast.success(`${statusInfo.title} successful for objective and ${descendants.length} child objective${descendants.length !== 1 ? 's' : ''}`);
    }

    setShowConfirmation(false);
    setSelectedStatus(null);
    onClose();
  };

  const availableStatuses = getAvailableStatuses(objective.status);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full p-6 relative shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Manage Status</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Current Status:</p>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(objective.status)}`}>
              {objective.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Available Actions:</p>
          <div className="space-y-2">
            {availableStatuses.map(status => {
              const statusInfo = getStatusInfo(status);
              if (!statusInfo) return null;

              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition ${statusInfo.buttonColor} text-white`}
                >
                  {statusInfo.icon}
                  <div className="text-left">
                    <div className="font-medium">{statusInfo.title}</div>
                    <div className="text-xs opacity-90">{statusInfo.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {availableStatuses.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500">No status changes available for this objective.</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedStatus && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setShowConfirmation(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 relative shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Status Change</h3>
            </div>

            <p className="text-gray-600 mb-6">
              {getStatusInfo(selectedStatus)?.confirmationMessage}
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 