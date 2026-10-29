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

export interface RegisterAccountRequest {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
}

export interface RegistrationResponse {
  success: boolean;
  resultCode: number;
  data: AuthResponseData;
  error?: { message?: string; traceId?: string; fieldErrors?: Record<string, string[]> };
}

export interface AuthResponseData {
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
  resultCode: number;
  data: {
    user: AuthResponseData;
    accessToken: string;
    accessTokenExpiresAtUtc: string;
    refreshToken: string;
    refreshTokenExpiresAtUtc: string;
  };
  error?: { message?: string; traceId?: string; fieldErrors?: Record<string, string[]> };
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
