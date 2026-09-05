export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  mobileNumber?: string | null;
  role: string;
  status: string;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  lastLoginAt?: string | null;
  state?: string | null;
  city?: string | null;
  marketingConsent?: boolean | null;
  petCount: number;
  createdAt: string;
}

export interface AdminPet {
  id: string;
  petName: string;
  species: string;
  speciesId?: string | null;
  breed?: string | null;
  gender?: string | null;
  ownerName: string;
  ownerUserId: string;
  ownerEmail?: string | null;
  createdAt: string;
}
