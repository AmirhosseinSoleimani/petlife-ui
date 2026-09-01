export type PreferredContactMethod = 'Email' | 'InApp';

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  address?: string | null;
  country: string;
  state?: string | null;
  city?: string | null;
  suburb?: string | null;
  postcode?: string | null;
  preferredContactMethod: PreferredContactMethod;
  notificationByEmail: boolean;
  notificationInApp: boolean;
  updatedAt?: string | null;
}

export interface UpdateCustomerProfileRequest {
  address?: string | null;
  country: string;
  state?: string | null;
  city?: string | null;
  suburb?: string | null;
  postcode?: string | null;
  preferredContactMethod: PreferredContactMethod;
  notificationByEmail: boolean;
  notificationInApp: boolean;
}
