export interface Pet {
  id: string;
  petName: string;
  species?: string;
  breed?: string;
  dateOfBirth?: string;
  approxAge?: string;
  gender?: string;
  weight?: number;
  colour?: string;
  microchipNumber?: string;
  desexedStatus?: string;
  behaviourNotes?: string;
  medicalNotes?: string;
  allergyNotes?: string;
  medicationNotes?: string;
  specialNeeds?: string;
  primaryVetName?: string;
  primaryVetPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface PetPayload {
  petName: string;
  species?: string;
  breed?: string;
  gender?: string;
  dateOfBirth?: string;
  approxAge?: string;
  weight?: number | null;
  behaviourNotes?: string;
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
}

export interface HealthRecordPayload {
  recordType?: string;
  title?: string;
  description?: string;
  recordDate?: string;
  nextDueDate?: string;
  vetName?: string;
  reminderRequired: boolean;
}

export interface HealthSummary {
  totalRecords?: number;
  lastVisitDate?: string;
  upcomingDueDate?: string;
  latestRecordType?: string;
}

export interface Expense {
  id: string;
  petId?: string;
  category?: string;
  amount: number;
  currency?: string;
  expenseDate?: string;
  description?: string;
  isRecurring?: boolean;
}

export interface ExpensePayload {
  category?: string;
  amount: number | null;
  expenseDate?: string;
  currency: string;
  description?: string;
  isRecurring: boolean;
}

export interface ExpenseSummary {
  totalAmount?: number;
  thisMonthAmount?: number;
  topCategory?: string;
}

export interface Reminder {
  id: string;
  petId?: string;
  title: string;
  dueDate?: string;
  reminderType?: string;
  description?: string;
  status?: string;
}

export interface ReminderPayload {
  petId: string | null;
  reminderType?: string;
  title: string;
  dueDate?: string;
  description?: string;
}

export interface EmergencyVet {
  id: string;
  name: string;
  suburb?: string;
  state?: string;
  phone?: string;
  address?: string;
  afterHours?: boolean;
  is24Hours?: boolean;
  instructions?: string;
}

export const PET_TYPE_OPTIONS = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Reptile', 'Fish', 'Other'];
export const PET_GENDER_OPTIONS = ['Male', 'Female', 'Unknown'];
export const HEALTH_RECORD_TYPE_OPTIONS = ['Vaccination', 'Medication', 'Checkup', 'Surgery', 'Allergy', 'Other'];
export const EXPENSE_CATEGORY_OPTIONS = ['Food', 'Vet', 'Medication', 'Grooming', 'Training', 'Boarding', 'Other'];
export const REMINDER_TYPE_OPTIONS = ['Vaccination', 'Medication', 'Appointment', 'Grooming', 'Other'];
