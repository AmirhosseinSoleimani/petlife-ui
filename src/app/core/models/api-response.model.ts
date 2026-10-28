export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
  fieldErrors?: Record<string, string[]>;
}

export interface ApiErrorBody {
  error?: { message?: string; traceId?: string; fieldErrors?: Record<string, string[]> };
  traceId?: string;
  success?: boolean;
  message?: string;
  errors?: string[];
  fieldErrors?: Record<string, string[]>;
}
