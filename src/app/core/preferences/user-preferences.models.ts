export type ThemeMode = 'Light' | 'Dark';
export type AccentColor = 'Teal' | 'Coral' | 'Blue' | 'Purple' | 'Green';
export type DisplayDensity = 'Comfortable' | 'Compact';
export type CustomerRequestFilter = 'All' | 'Active' | 'Completed' | 'Rejected';
export type ProviderRequestFilter = 'All' | 'New' | 'Accepted' | 'Completed' | 'Rejected';

export interface UserPreferences {
  id?: string | null;
  themeMode: ThemeMode;
  accentColor: AccentColor;
  displayDensity: DisplayDensity;
  defaultPetId: string | null;
  customerDefaultRequestFilter: CustomerRequestFilter | null;
  providerDefaultRequestFilter: ProviderRequestFilter | null;
  quickActions: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UpdateUserPreferencesRequest {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  displayDensity: DisplayDensity;
  defaultPetId: string | null;
  customerDefaultRequestFilter: CustomerRequestFilter | null;
  providerDefaultRequestFilter: ProviderRequestFilter | null;
  quickActions: string[];
}

export interface QuickActionDefinition {
  key: string;
  labelKey: string;
  path: string;
  marker: string;
  queryParams?: Record<string, string>;
  urgent?: boolean;
}

export const CUSTOMER_QUICK_ACTIONS: QuickActionDefinition[] = [
  { key: 'addPet', labelKey: 'dashboard.addPet', path: '/pets', marker: '+', queryParams: { action: 'add' } },
  { key: 'addReminder', labelKey: 'dashboard.addReminder', path: '/reminders', marker: '✓' },
  { key: 'browseServices', labelKey: 'dashboard.browseServices', path: '/services', marker: '⌕' },
  { key: 'myRequests', labelKey: 'nav.myRequests', path: '/service-requests/my', marker: '≡' },
  { key: 'emergencyVets', labelKey: 'dashboard.findEmergencyVet', path: '/emergency-vets', marker: '+', urgent: true },
  { key: 'pets', labelKey: 'nav.pets', path: '/pets', marker: '●' }
];

export const CUSTOMER_DEFAULT_QUICK_ACTIONS = ['addPet', 'browseServices', 'myRequests', 'emergencyVets'];

export const PROVIDER_QUICK_ACTIONS: QuickActionDefinition[] = [
  { key: 'incomingRequests', labelKey: 'nav.incomingRequests', path: '/provider/requests', marker: '≡' },
  { key: 'myServices', labelKey: 'nav.providerServices', path: '/provider/services', marker: '▦' },
  { key: 'editProviderProfile', labelKey: 'nav.providerProfile', path: '/provider/profile', marker: '✎' },
  { key: 'serviceAreas', labelKey: 'nav.serviceAreas', path: '/provider/service-areas', marker: '⌖' },
  { key: 'addService', labelKey: 'providerServices.addService', path: '/provider/services', marker: '+', queryParams: { action: 'add' } }
];

export const PROVIDER_DEFAULT_QUICK_ACTIONS = ['incomingRequests', 'myServices', 'editProviderProfile', 'serviceAreas'];
