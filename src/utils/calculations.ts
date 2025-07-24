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
    case 'completed': return 'text-green-600 bg-green-100';
    case 'on-track': return 'text-blue-600 bg-blue-100';
    case 'at-risk': return 'text-amber-600 bg-amber-100';
    case 'behind': return 'text-red-600 bg-red-100';
    case 'not-started': return 'text-gray-600 bg-gray-100';
    default: return 'text-gray-600 bg-gray-100';
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
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}