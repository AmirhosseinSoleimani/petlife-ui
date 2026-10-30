export const environment = {
  production: true,
  apiBaseUrl: '/api',
  // Enable separately only after production Gateway/Host and data-owner verification.
  notificationsApiEnabled: false,
  // These two services are not present in the reviewed backend Gateway route catalog.
  // Enable only when backend ownership, endpoints, and LAN routing are verified.
  geographyApiEnabled: false,
  emergencyVetsApiEnabled: false,
  preferencesApiEnabled: false
};
