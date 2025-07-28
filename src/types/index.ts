export type OKRLevel = 'company' | 'team' | 'individual';
export type KeyResultType = 'percentage' | 'number' | 'boolean';
export type OKRStatus = 'not-started' | 'on-track' | 'at-risk' | 'behind' | 'completed' | 'on-hold' | 'cancelled';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface KeyResult {
  id: string;
  title: string;
  description?: string;
  type: KeyResultType;
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit?: string;
  progress: number;
  status: OKRStatus;
  owner: string;
  checkIns: CheckIn[];
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
}

export interface Objective {
  id: string;
  title: string;
  description?: string;
  level: OKRLevel;
  owner: string;
  // Deprecated: use startQuarter/startYear and endQuarter/endYear
  quarter?: Quarter;
  year?: number;
  startQuarter: Quarter;
  startYear: number;
  endQuarter: Quarter;
  endYear: number;
  progress: number;
  status: OKRStatus;
  keyResults: KeyResult[];
  parentId?: string;
  workspaceId: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface CheckIn {
  id: string;
  keyResultId: string;
  value: number;
  comment: string;
  confidence: number;
  date: string;
  author: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface OKRSettings {
  currentQuarter: Quarter;
  currentYear: number;
  defaultUser: User;
}