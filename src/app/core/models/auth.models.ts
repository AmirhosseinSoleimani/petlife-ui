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


/** Current Users /v1/identity/profile response (not the legacy Customer location DTO). */
export interface IdentityProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  mobileNumber: string | null;
  role: string;
  status: string;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  // Available after the Users service address extension is deployed.
  address?: string | null;
  suburb?: string | null;
  postcode?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface UpdateIdentityProfileRequest {
  firstName: string;
  lastName: string;
}

/** Editable form values are always strings, even for an empty optional field. */
export interface IdentityAddressForm {
  address: string;
  suburb: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
}

/** PUT /v1/identity/profile/address; null clears an optional address field. */
export interface UpdateIdentityAddressRequest {
  address?: string | null;
  suburb?: string | null;
  postcode?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}
