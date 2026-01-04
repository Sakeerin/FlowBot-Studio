import { describe, it, expect } from 'vitest';
import { generateId, isValidId } from './id';

describe('id utils', () => {
  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('isValidId', () => {
    it('should return true for valid IDs', () => {
      expect(isValidId('test-id-123')).toBe(true);
      expect(isValidId('a')).toBe(true);
    });

    it('should return false for invalid IDs', () => {
      expect(isValidId('')).toBe(false);
    });
  });
});

