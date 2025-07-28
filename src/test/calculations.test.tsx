import { describe, it, expect } from 'vitest';
import { calculateObjectiveStatus, getStatusColor, getProgressBarColor } from '../utils/calculations';

describe('calculations', () => {
  describe('calculateObjectiveStatus', () => {
    it('should return completed for 100% progress', () => {
      expect(calculateObjectiveStatus(100)).toBe('completed');
    });

    it('should return on-track for progress >= 70', () => {
      expect(calculateObjectiveStatus(70)).toBe('on-track');
      expect(calculateObjectiveStatus(85)).toBe('on-track');
      expect(calculateObjectiveStatus(99)).toBe('on-track');
    });

    it('should return at-risk for progress >= 40 and < 70', () => {
      expect(calculateObjectiveStatus(40)).toBe('at-risk');
      expect(calculateObjectiveStatus(50)).toBe('at-risk');
      expect(calculateObjectiveStatus(69)).toBe('at-risk');
    });

    it('should return behind for progress > 0 and < 40', () => {
      expect(calculateObjectiveStatus(1)).toBe('behind');
      expect(calculateObjectiveStatus(20)).toBe('behind');
      expect(calculateObjectiveStatus(39)).toBe('behind');
    });

    it('should return not-started for 0% progress', () => {
      expect(calculateObjectiveStatus(0)).toBe('not-started');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(getStatusColor('completed')).toBe('text-green-600 bg-green-100');
      expect(getStatusColor('on-track')).toBe('text-blue-600 bg-blue-100');
      expect(getStatusColor('at-risk')).toBe('text-amber-600 bg-amber-100');
      expect(getStatusColor('behind')).toBe('text-red-600 bg-red-100');
      expect(getStatusColor('not-started')).toBe('text-gray-600 bg-gray-100');
      expect(getStatusColor('on-hold')).toBe('text-orange-600 bg-orange-100');
      expect(getStatusColor('cancelled')).toBe('text-red-600 bg-red-100');
    });

    it('should return default color for unknown status', () => {
      expect(getStatusColor('unknown' as any)).toBe('text-gray-600 bg-gray-100');
    });
  });

  describe('getProgressBarColor', () => {
    it('should return green for progress >= 70', () => {
      expect(getProgressBarColor(70)).toBe('bg-green-500');
      expect(getProgressBarColor(85)).toBe('bg-green-500');
      expect(getProgressBarColor(100)).toBe('bg-green-500');
    });

    it('should return amber for progress >= 40 and < 70', () => {
      expect(getProgressBarColor(40)).toBe('bg-amber-500');
      expect(getProgressBarColor(50)).toBe('bg-amber-500');
      expect(getProgressBarColor(69)).toBe('bg-amber-500');
    });

    it('should return red for progress < 40', () => {
      expect(getProgressBarColor(0)).toBe('bg-red-500');
      expect(getProgressBarColor(20)).toBe('bg-red-500');
      expect(getProgressBarColor(39)).toBe('bg-red-500');
    });
  });
}); 