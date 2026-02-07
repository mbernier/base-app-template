export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Analytics types
export interface PageVisitData {
  anonymousId: string;
  sessionId: string;
  path: string;
  referrer?: string | null;
  queryParams?: Record<string, string>;
  userAgent?: string;
  screenWidth?: number;
  screenHeight?: number;
}

export interface AnalyticsEventData {
  anonymousId: string;
  eventType: string;
  properties?: Record<string, unknown>;
}

export interface TrackRequest {
  type: 'page_visit' | 'event';
  data: PageVisitData | AnalyticsEventData;
}

// Transaction types
export interface TransactionRequest {
  to: string;
  amount: string;
  data?: string;
}

export interface TransactionResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}
