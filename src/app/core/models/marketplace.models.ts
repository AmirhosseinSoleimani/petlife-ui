export interface Provider {
  id: string;
  providerId?: string;
  providerProfileId?: string;
  userId?: string;
  businessName?: string;
  businessDescription?: string;
  name?: string;
  contactName?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  websiteUrl?: string;
  addressLine1?: string;
  addressLine2?: string;
  verificationStatus?: string;
  isVerified?: boolean;
  verified?: boolean;
  isActive?: boolean;
  isAvailable?: boolean;
  description?: string;
}

export interface ProviderProfilePayload {
  businessName?: string;
  abn?: string;
  contactName?: string;
  phoneNumber?: string;
  email?: string;
  websiteUrl?: string;
  businessDescription?: string;
  addressLine1?: string;
  addressLine2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  isActive?: boolean;
}

export interface ProviderService {
  id: string;
  providerId?: string;
  providerProfileId?: string;
  providerUserId?: string;
  providerName?: string;
  businessName?: string;
  providerBusinessName?: string;
  provider?: Provider;
  name?: string;
  serviceName?: string;
  category?: string;
  price?: number;
  currency?: string;
  durationMinutes?: number;
  description?: string;
  isActive?: boolean;
}

export interface ProviderServicePayload {
  serviceName?: string;
  category?: string;
  description?: string;
  price: number | null;
  currency?: string;
  durationMinutes: number | null;
  isActive: boolean;
}

export interface ServiceArea {
  id: string;
  providerUserId?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  radiusKm?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface ServiceAreaPayload {
  suburb?: string;
  state?: string;
  postcode?: string;
  radiusKm: number | null;
  isActive: boolean;
}

export interface ServiceRequestPayload {
  petId: string | null;
  providerServiceId: string | null;
  requestMessage?: string;
  requestedDate: string;
}

export interface ServiceRequest {
  id: string;
  status?: string;
  requestMessage?: string;
  createdAt?: string;
  requestedDate?: string;
  scheduledDate?: string;
  petId?: string;
  petName?: string;
  providerId?: string;
  providerProfileId?: string;
  pet?: {
    id?: string;
    petName?: string;
    name?: string;
  };
  providerServiceId?: string;
  providerService?: ProviderService;
  serviceName?: string;
  providerServiceName?: string;
  providerBusinessName?: string;
  businessName?: string;
  providerName?: string;
  provider?: Provider;
  customerUserId?: string;
  providerUserId?: string;
  customerName?: string;
  rejectionReason?: string;
  completedDate?: string;
}

export interface RejectServiceRequestPayload {
  rejectionReason?: string;
}

export const PROVIDER_SERVICE_CATEGORY_OPTIONS = ['Grooming', 'Walking', 'Boarding', 'Training', 'Veterinary', 'Pet Sitting', 'Other'];
