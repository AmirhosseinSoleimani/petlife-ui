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
