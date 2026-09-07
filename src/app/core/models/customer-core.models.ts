export interface PetDynamicFieldDefinition {
  id: string;
  speciesId: string;
  key: string;
  label: string;
  dataType: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | string;
  isRequired: boolean;
  options: string[];
  unit?: string | null;
  placeholder?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface PetSubgroup {
  id: string;
  speciesId: string;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PetBreed {
  id: string;
  speciesId: string;
  subgroupId?: string | null;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PetSpecies {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  subgroups: PetSubgroup[];
  breeds: PetBreed[];
}

export interface PetTaxonomy {
  species: PetSpecies[];
}

export interface Pet {
  id: string;
  petName: string;
  species: string;
  breed?: string | null;
  speciesId?: string | null;
  subgroupId?: string | null;
  breedId?: string | null;
  speciesName?: string | null;
  subgroupName?: string | null;
  breedName?: string | null;
  dateOfBirth?: string | null;
  approxAge?: string | null;
  gender?: string | null;
  weight?: number | null;
  colour?: string | null;
  microchipNumber?: string | null;
  desexedStatus?: string | null;
  reproductiveStatus?: string | null;
  behaviourNotes?: string | null;
  handlingNotes?: string | null;
  temperament?: string | null;
  socialCompatibility?: string | null;
  medicalNotes?: string | null;
  allergyNotes?: string | null;
  medicationNotes?: string | null;
  specialNeeds?: string | null;
  livingEnvironment?: string | null;
  equipmentNotes?: string | null;
  feedingNotes?: string | null;
  primaryVetName?: string | null;
  primaryVetPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  dynamicValues: Record<string, string | null>;
  profileImageUrl?: string | null;
  createdAt?: string;
}

export interface PetPayload {
  petName: string;
  species: string;
  breed?: string;
  speciesId?: string | null;
  subgroupId?: string | null;
  breedId?: string | null;
  gender?: string;
  dateOfBirth?: string;
  approxAge?: string;
  weight?: number | null;
  colour?: string;
  microchipNumber?: string;
  desexedStatus?: string;
  reproductiveStatus?: string;
  behaviourNotes?: string;
  handlingNotes?: string;
  temperament?: string;
  socialCompatibility?: string;
  medicalNotes?: string;
  allergyNotes?: string;
  medicationNotes?: string;
  specialNeeds?: string;
  livingEnvironment?: string;
  equipmentNotes?: string;
  feedingNotes?: string;
  primaryVetName?: string;
  primaryVetPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  dynamicValues: Record<string, string | null>;
}

export interface HealthRecord {
  id: string;
  petId?: string;
  title?: string;
  recordType?: string;
  description?: string;
  recordDate?: string;
  vetClinicName?: string;
  vetName?: string;
  nextDueDate?: string;
  dosage?: string;
  frequency?: string;
  vaccineName?: string;
  vaccineManufacturer?: string;
  vaccineBatchNumber?: string;
  medicationName?: string;
  doseAmount?: number | null;
  doseUnit?: string;
  administrationRoute?: string;
  preventiveCareType?: string;
  visitReason?: string;
  visitOutcome?: string;
  measurementType?: string;
  measurementValue?: number | null;
  measurementUnit?: string;
  reminderRequired?: boolean;
}

export interface HealthRecordPayload {
  recordType: string;
  title: string;
  description?: string;
  recordDate: string;
  nextDueDate?: string;
  vetClinicName?: string;
  vetName?: string;
  dosage?: string;
  frequency?: string;
  vaccineName?: string;
  vaccineManufacturer?: string;
  vaccineBatchNumber?: string;
  medicationName?: string;
  doseAmount?: number | null;
  doseUnit?: string;
  administrationRoute?: string;
  preventiveCareType?: string;
  visitReason?: string;
  visitOutcome?: string;
  measurementType?: string;
  measurementValue?: number | null;
  measurementUnit?: string;
  reminderRequired: boolean;
}

export interface FileAsset {
  id: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  url?: string | null;
  createdAt: string;
}

export interface HealthSummary {
  petId?: string;
  totalRecords?: number;
  lastRecordDate?: string | null;
  nextDueDate?: string | null;
  recentRecords?: HealthRecord[];
  upcomingDueRecords?: HealthRecord[];
}

export interface CustomerProfile {
  userId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  mobileNumber?: string | null;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  address?: string | null;
  country: string;
  state?: string | null;
  city?: string | null;
  suburb?: string | null;
  postcode?: string | null;
  preferredContactMethod?: string | null;
  notificationByEmail: boolean;
  notificationInApp: boolean;
  marketingConsent: boolean;
  consentUpdatedAt?: string | null;
}

export interface CustomerProfilePayload {
  address?: string;
  country: string;
  state?: string;
  city?: string;
  suburb?: string;
  postcode?: string;
  preferredContactMethod?: string;
  notificationByEmail: boolean;
  notificationInApp: boolean;
  marketingConsent: boolean;
}

export interface Expense {
  id: string;
  petId?: string;
  category?: string;
  categoryId?: string | null;
  amount: number;
  currency?: string;
  expenseDate?: string;
  vendorName?: string | null;
  description?: string;
  receiptFileId?: string | null;
  receiptFileName?: string | null;
  paymentMethod?: string | null;
  isRecurring?: boolean;
  allocations?: Array<{ petId: string; petName?: string; amount: number }>;
}

export interface ExpensePayload {
  category: string;
  categoryId?: string | null;
  amount: number | null;
  expenseDate?: string;
  currency: string;
  vendorName?: string;
  description?: string;
  paymentMethod?: string;
  isRecurring: boolean;
  allocations?: Array<{ petId: string; amount: number }>;
}

export interface ExpenseSummary {
  totalAmount?: number;
  thisMonthAmount?: number;
  topCategory?: string;
}

export interface Reminder {
  id: string;
  petId?: string;
  templateId?: string | null;
  title: string;
  dueDate?: string;
  reminderType?: string;
  description?: string;
  recurrenceType?: string;
  recurrenceInterval?: number;
  recurrenceEndDate?: string | null;
  completionCount?: number;
  lastCompletedAt?: string | null;
  status?: string;
  computedState?: string;
  snoozeUntil?: string | null;
  isExpiryReminder?: boolean;
  sourceType?: string | null;
  sourceExpiryDate?: string | null;
}

export interface ReminderPayload {
  petId: string | null;
  templateId?: string | null;
  reminderType: string;
  title: string;
  dueDate?: string;
  description?: string;
  recurrenceType: string;
  recurrenceInterval: number;
  recurrenceEndDate?: string | null;
  notificationChannel?: string;
}

export interface EmergencyVet {
  id: string;
  name?: string;
  clinicName?: string;
  vetClinicName?: string;
  businessName?: string;
  suburb?: string;
  state?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  websiteUrl?: string;
  address?: string;
  afterHours?: boolean;
  isAfterHours?: boolean;
  is24Hours?: boolean;
  is24h?: boolean;
  open24Hours?: boolean;
  instructions?: string;
  description?: string;
  notes?: string;
  addressLine1?: string;
  addressLine2?: string;
  postcode?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  supportedSpecies?: string[];
  isVerified?: boolean;
  lastVerifiedAt?: string | null;
  distanceKm?: number | null;
  mapsUrl?: string;
  googleMapsUrl?: string;
  appleMapsUrl?: string;
  openingHoursNotes?: string;
  emergencyInstructions?: string;
  offersAfterHours?: boolean;
  offers24HourService?: boolean;
}

export const PET_TYPE_OPTIONS = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Reptile', 'Fish', 'Small Mammal', 'Exotic Pet', 'Other'];
export const PET_GENDER_OPTIONS = ['Male', 'Female', 'Unknown'];
export const HEALTH_RECORD_TYPE_OPTIONS = ['Vaccination', 'Medication', 'PreventiveCare', 'VetVisit', 'Measurement', 'General'];
export const EXPENSE_CATEGORY_OPTIONS = ['Food', 'Vet', 'Medication', 'Grooming', 'Training', 'Boarding', 'Other'];
export const REMINDER_TYPE_OPTIONS = ['Vaccination', 'Medication', 'Appointment', 'Grooming', 'Other'];
