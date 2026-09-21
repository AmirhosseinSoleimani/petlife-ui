export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegisterCustomerRequest = RegisterRequest;
export type RegisterProviderRequest = RegisterRequest;

export enum AuthResultCode {
  Success = 0,
  BusinessOrValidationError = 1,
  AccessDenied = 2,
  AuthenticationRequired = 3,
  UnhandledError = 4
}

export interface AuthError {
  message?: string;
  traceId?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface AuthApiResponse<T> {
  success: boolean;
  resultCode: AuthResultCode;
  data: T;
  error: AuthError;
}

export interface AuthResponseData {
  token: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  mobileNumber?: string | null;
  role: string;
  status: string;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
}

export type LoginResponse = AuthApiResponse<AuthResponseData>;

export interface ContactVerificationStatus {
  email?: string | null;
  mobileNumber?: string | null;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  emailVerifiedAt?: string | null;
  mobileVerifiedAt?: string | null;
  nextEmailResendAt?: string | null;
  nextMobileResendAt?: string | null;
}

export type ContactVerificationChannel = 'Email' | 'Mobile';

export interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
  role?: string;
  status?: string;
  isEmailVerified?: boolean;
  isMobileVerified?: boolean;
}
