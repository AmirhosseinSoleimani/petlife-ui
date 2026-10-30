export const environment = {
  production: true,
  apiBaseUrl: '/api',
  // Notifications /v1 endpoints are deployed behind the production Gateway.
  notificationsApiEnabled: true,
  // These two services are not present in the reviewed backend Gateway route catalog.
  // Enable only when backend ownership, endpoints, and LAN routing are verified.
  geographyApiEnabled: false,
  emergencyVetsApiEnabled: false,
  preferencesApiEnabled: false
};
