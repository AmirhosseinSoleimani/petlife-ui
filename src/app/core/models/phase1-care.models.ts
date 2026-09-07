export interface HealthTimelineItem {
  itemKind: string;
  itemId: string;
  date: string;
  type: string;
  title: string;
  description?: string | null;
  measurementValue?: number | null;
  measurementUnit?: string | null;
  medicationName?: string | null;
  status?: string | null;
}

export interface VitalMeasurement {
  type: string;
  value: number;
  unit: string;
  recordedOn: string;
}

export interface VitalMedication {
  healthRecordId: string;
  name: string;
  dose?: string | null;
  frequency?: string | null;
  recordedOn: string;
}

export interface VitalSummary {
  petId: string;
  petName: string;
  species: string;
  breed?: string | null;
  allergyNotes?: string | null;
  medicalNotes?: string | null;
  specialNeeds?: string | null;
  medicationNotes?: string | null;
  recentMedications: VitalMedication[];
  latestMeasurements: VitalMeasurement[];
  generatedAt: string;
}

export interface PetShareGrant {
  id: string;
  petId: string;
  recipientUserId?: string | null;
  recipientLabel?: string | null;
  purpose?: string | null;
  scopes: string[];
  expiresAt: string;
  revokedAt?: string | null;
  isActive: boolean;
  accessCount: number;
  lastAccessedAt?: string | null;
  createdAt: string;
  accessToken?: string | null;
}

export interface CreatePetSharePayload {
  scopes: string[];
  expiresAt: string;
  recipientUserId?: string | null;
  recipientLabel?: string | null;
  purpose?: string | null;
}


export interface PetShareAudit {
  id: string;
  action: string;
  accessMode: string;
  accessorUserId?: string | null;
  createdAt: string;
}

export interface SharedPetProfile {
  petId: string;
  petName: string;
  species: string;
  breed?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  colour?: string | null;
  temperament?: string | null;
  handlingNotes?: string | null;
  specialNeeds?: string | null;
}

export interface ScopedPetShare {
  shareId: string;
  expiresAt: string;
  scopes: string[];
  petProfile?: SharedPetProfile | null;
  vitalSummary?: VitalSummary | null;
  healthTimeline?: HealthTimelineItem[] | null;
  measurements?: VitalMeasurement[] | null;
  medications?: VitalMedication[] | null;
}

export interface ReminderTemplate {
  id: string;
  code: string;
  name: string;
  reminderType: string;
  description?: string | null;
  defaultTitle: string;
  defaultDescription?: string | null;
  defaultRecurrenceType: string;
  defaultRecurrenceInterval: number;
  suggestedOffsetDays?: number | null;
  isActive: boolean;
  version: number;
  speciesIds: string[];
}

export interface ReminderTemplatePayload {
  code: string;
  name: string;
  reminderType: string;
  description?: string | null;
  defaultTitle: string;
  defaultDescription?: string | null;
  defaultRecurrenceType: string;
  defaultRecurrenceInterval: number;
  suggestedOffsetDays?: number | null;
  isActive: boolean;
  speciesIds: string[];
}

export interface ExpenseAllocation {
  petId: string;
  petName?: string;
  amount: number;
}

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  speciesIds: string[];
}

export interface ExpenseCategoryPayload {
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  speciesIds: string[];
}

export interface ExpenseCurrencyTotal {
  currency: string;
  amount: number;
}

export interface ExpenseBreakdown {
  key: string;
  label: string;
  totals: ExpenseCurrencyTotal[];
}

export interface ExpenseReport {
  period: string;
  year: number;
  month?: number | null;
  totals: ExpenseCurrencyTotal[];
  byCategory: ExpenseBreakdown[];
  byPet: ExpenseBreakdown[];
}

export const PET_SHARE_SCOPES = ['PetProfile', 'VitalSummary', 'HealthTimeline', 'Measurements', 'Medications'];
export const RECURRENCE_TYPES = ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'];
