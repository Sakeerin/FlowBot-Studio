// ID generation utilities
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0;
}

