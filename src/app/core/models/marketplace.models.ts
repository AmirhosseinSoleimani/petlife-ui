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
  businessEntityType?: 'Independent' | 'Business';
  preferredLeadChannel?: 'Email' | 'Phone' | 'SMS';
  contactVisibility?: 'Always' | 'AfterRequestAccepted' | 'Never';
  isContactVisible?: boolean;
  primaryGeographyAreaId?: string | null;
  acceptingRequests?: boolean;
  timeZone?: string;
  latitude?: number;
  longitude?: number;
  workingHours?: ProviderWorkingHour[];
  expertise?: ProviderExpertise[];
  trustBadges?: TrustBadge[];
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
  businessEntityType?: 'Independent' | 'Business';
  preferredLeadChannel?: 'Email' | 'Phone' | 'SMS';
  contactVisibility?: 'Always' | 'AfterRequestAccepted' | 'Never';
  primaryGeographyAreaId?: string | null;
  acceptingRequests?: boolean;
  timeZone?: string;
  latitude?: number | null;
  longitude?: number | null;
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
  sortOrder?: number;
  isActive?: boolean;
}

export interface ServiceDefinition {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  key?: string;
  description?: string;
  applicableSpecies: string[];
  sortOrder?: number;
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
  priceMax?: number | null;
  pricingType?: 'Fixed' | 'From' | 'Quote';
  pricingNotes?: string;
  specialConditions?: string;
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
  providerAcceptingRequests?: boolean;
  providerPreferredLeadChannel?: string;
  providerWorkingHours?: ProviderWorkingHour[];
  providerExpertise?: ProviderExpertise[];
  distanceKm?: number | null;
  isTemporarilyClosed?: boolean;
  temporaryClosedUntil?: string | null;
  availabilityWindows?: ProviderServiceAvailabilityWindow[];
}

export interface ProviderServicePayload {
  serviceDefinitionId: string | null;
  serviceName?: string;
  category?: string;
  description?: string;
  price: number | null;
  priceMax?: number | null;
  pricingType?: 'Fixed' | 'From' | 'Quote';
  pricingNotes?: string;
  specialConditions?: string;
  currency?: string;
  durationMinutes: number | null;
  deliveryMode: DeliveryMode;
  isActive: boolean;
}

export type DeliveryMode = 'AtProviderLocation' | 'AtCustomerLocation' | 'Online' | 'Hybrid';

export interface GeographyArea {
  id: string;
  city: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ProviderWorkingHour {
  id?: string;
  dayOfWeek: number;
  opensAt?: string | null;
  closesAt?: string | null;
  isClosed: boolean;
  isAfterHours: boolean;
  timeZone?: string;
}

export interface ProviderExpertise {
  id?: string;
  title: string;
  description?: string;
  yearsExperience: number;
  isVerified?: boolean;
}

export interface ProviderMedia {
  id: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  url?: string | null;
  caption?: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ServiceArea {
  id: string;
  providerUserId?: string;
  geographyAreaId?: string | null;
  city?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  radiusKm?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface ServiceAreaPayload {
  geographyAreaId?: string | null;
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
  serviceGeographyAreaId?: string | null;
  consentSharePetProfile: boolean;
  consentShareHealthSummary: boolean;
  consentShareContactDetails: boolean;
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
  petMedicalNotes?: string | null;
  petAllergyNotes?: string | null;
  petMedicationNotes?: string | null;
  rejectionReason?: string;
  completedDate?: string;
  deliveryMode?: DeliveryMode;
  serviceAddressLine1?: string;
  serviceSuburb?: string;
  serviceState?: string;
  servicePostcode?: string;
  serviceGeographyAreaId?: string | null;
  consentSharePetProfile?: boolean;
  consentShareHealthSummary?: boolean;
  consentShareContactDetails?: boolean;
  consentCapturedAt?: string | null;
  providerResponseMessage?: string | null;
  firstViewedAt?: string | null;
  firstRespondedAt?: string | null;
  contactedAt?: string | null;
  lastStatusChangedAt?: string;
  bookingStatus?: 'None' | 'Proposed' | 'Confirmed' | string;
  proposedServiceAt?: string | null;
  confirmedServiceAt?: string | null;
  statusHistory?: ServiceRequestStatusHistory[];
  allergiesSummary?: string | null;
  medicationsSummary?: string | null;
  medicalSummary?: string | null;
}

export interface RejectServiceRequestPayload {
  rejectionReason?: string;
}


export interface TrustBadge {
  key: string;
  label: string;
  isActive: boolean;
  expiresAt?: string | null;
}

export interface ProviderDocument {
  id: string;
  providerUserId: string;
  documentType: string;
  status: string;
  expiryDate?: string | null;
  rejectionReason?: string | null;
  providerNote?: string | null;
  originalFileName: string;
  sizeBytes: number;
  reviewedAt?: string | null;
  createdAt: string;
  reviews?: Array<{ id: string; previousStatus: string; newStatus: string; reason?: string | null; createdAt: string }>;
}

export interface ProviderVerification {
  providerUserId: string;
  providerProfileId: string;
  businessName: string;
  verificationStatus: string;
  documents: ProviderDocument[];
  badges: TrustBadge[];
}

export interface ServiceRequestStatusHistory {
  id: string;
  previousStatus?: string | null;
  newStatus: string;
  actorRole: string;
  note?: string | null;
  changedAt: string;
}

export interface ProviderServiceAvailabilityWindow {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity?: number | null;
}

export interface ProviderLeadDashboard {
  from: string;
  to: string;
  newRequests: number;
  viewedRequests: number;
  respondedRequests: number;
  availableRequests: number;
  acceptedRequests: number;
  completedRequests: number;
  unansweredOver24Hours: number;
  averageFirstResponseMinutes?: number | null;
}

export interface ProviderRecommendation {
  service: ProviderService;
  score: number;
  reasons: Array<{ code: string; label: string }>;
}

export interface AdminKpi {
  from: string;
  to: string;
  newUsers: number;
  activeUsers: number;
  newPets: number;
  providerSearches: number;
  providerContactClicks: number;
  serviceRequests: number;
  completedServiceRequests: number;
  completionRatePercent: number;
  openFeedbackReports: number;
}

export interface AdminRequestOversight {
  items: ServiceRequest[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface FeedbackReport {
  id: string;
  reporterUserId: string;
  reporterRole: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  adminNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}
