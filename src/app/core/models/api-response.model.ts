export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
  fieldErrors?: Record<string, string[]>;
}

export interface ApiErrorBody {
  success?: boolean;
  message?: string;
  errors?: string[];
  fieldErrors?: Record<string, string[]>;
}
