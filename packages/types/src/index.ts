export interface ApiEnvelope<T> {
  status: number;
  message: string;
  data: T;
}

export interface PaginationMeta {
  totalItems: number;
  limit: number;
  offset: number;
  currentPage: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface PaginatedApiEnvelope<T> extends ApiEnvelope<T> {
  pagination: PaginationMeta;
}
