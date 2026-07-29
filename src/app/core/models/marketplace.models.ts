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
  providerTypes?: ProviderType[];
  facilities?: ProviderFacility[];
  supportedSpecies?: string[];
  location?: ProviderLocation;
  isSetupComplete?: boolean;
  missingSetupItems?: string[];
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
  providerTypeIds: string[];
  facilityIds: string[];
  supportedSpecies: string[];
}

export interface ProviderType {
  id: string;
  name: string;
  key?: string;
  description?: string;
}

export interface ProviderFacility {
  id: string;
  name: string;
  key?: string;
  category?: string;
  description?: string;
  isVerified?: boolean;
}

export interface ProviderLocation {
  addressLine1?: string;
  addressLine2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  key?: string;
  description?: string;
  iconKey?: string;
}

export interface ServiceDefinition {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  key?: string;
  description?: string;
  applicableSpecies: string[];
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
  serviceDefinitionId?: string;
  serviceCategoryId?: string;
  serviceCategoryName?: string;
  deliveryMode?: DeliveryMode;
  applicableSpecies?: string[];
  providerTypes?: string[];
  facilities?: string[];
  providerSupportedSpecies?: string[];
  providerAddressLine1?: string;
  providerSuburb?: string;
  providerState?: string;
  providerPostcode?: string;
}

export interface ProviderServicePayload {
  serviceDefinitionId: string | null;
  serviceName?: string;
  category?: string;
  description?: string;
  price: number | null;
  currency?: string;
  durationMinutes: number | null;
  deliveryMode: DeliveryMode;
  isActive: boolean;
}

export type DeliveryMode = 'AtProviderLocation' | 'AtCustomerLocation' | 'Online' | 'Hybrid';

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
  serviceAddressLine1?: string;
  serviceSuburb?: string;
  serviceState?: string;
  servicePostcode?: string;
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
    species?: string;
    breed?: string;
  };
  providerServiceId?: string;
  providerService?: ProviderService;
  serviceName?: string;
  serviceCategory?: string;
  providerServiceName?: string;
  providerBusinessName?: string;
  businessName?: string;
  providerName?: string;
  provider?: Provider;
  customerUserId?: string;
  providerUserId?: string;
  customerName?: string;
  customerEmail?: string;
  petSpecies?: string;
  petBreed?: string;
  rejectionReason?: string;
  completedDate?: string;
  deliveryMode?: DeliveryMode;
  serviceAddressLine1?: string;
  serviceSuburb?: string;
  serviceState?: string;
  servicePostcode?: string;
}

export interface RejectServiceRequestPayload {
  rejectionReason?: string;
}
