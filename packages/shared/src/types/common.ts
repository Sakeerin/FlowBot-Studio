// Common types used across web and api

export type TenantId = string;
export type UserId = string;
export type BotId = string;
export type NodeId = string;
export type EdgeId = string;

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

