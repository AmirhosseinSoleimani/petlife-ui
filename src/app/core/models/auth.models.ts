export interface LoginRequest {
  email: string;
  identifier?: string;
  password: string;
}

export interface RegisterCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  password: string;
}

export interface RegisterCustomerMobileRequest {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
  password: string;
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

export interface LoginResponse {
  success: boolean;
  message: string;
  data: AuthResponseData;
  errors?: string[];
}

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

/** Standalone Users v1 login returns a different JSON envelope. */
export interface IndependentIdentityResponse<T> {
  success: boolean;
  resultCode: number;
  data: T;
  error?: { message?: string; traceId?: string; fieldErrors?: Record<string, string[]> };
}

export interface IndependentLoginResponse extends IndependentIdentityResponse<{
  user: Omit<AuthResponseData, 'token'>;
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
}> {}
