import { Objective, OKRStatus } from '../types';

export function calculateObjectiveStatus(progress: number): OKRStatus {
  if (progress === 100) return 'completed';
  if (progress >= 70) return 'on-track';
  if (progress >= 40) return 'at-risk';
  if (progress > 0) return 'behind';
  return 'not-started';
}

export function getStatusColor(status: OKRStatus): string {
  switch (status) {
    case 'not-started':
      return 'bg-gray-100 text-gray-800';
    case 'on-track':
      return 'bg-green-100 text-green-800';
    case 'at-risk':
      return 'bg-amber-100 text-amber-800';
    case 'behind':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'on-hold':
      return 'bg-orange-100 text-orange-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getProgressBarColor(progress: number): string {
  if (progress >= 70) return 'bg-green-500';
  if (progress >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function exportOKRData(objectives: Objective[]): string {
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    version: '1.0',
    objectives
  }, null, 2);
}

export function importOKRData(jsonData: string): Objective[] {
  try {
    const data = JSON.parse(jsonData);
    return data.objectives || [];
  } catch {
    throw new Error('Invalid JSON format');
  }
}