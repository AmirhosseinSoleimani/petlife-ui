# PetLifeAU Frontend Final Fix Pack

Baseline: `petlife-ui-enterprise-refactored.zip`

## UI fixes
- Reminders toolbar no longer inherits the generic `.filters` surface. It now uses a dedicated `reminder-filters` container with 16px padding and stable responsive layout.
- Added scoped `app-loading-state` with a subtle staggered paw-trail animation. It is used only in selected loading states and does not override global `.state` behavior.
- Provider badges use larger readable text, stable line-height, nowrap, and consistent spacing.
- Customer request detail/timeline is responsive on narrow widths and status words no longer split awkwardly.
- Page message/error icon and text use flex layout with a real 10px gap instead of overlapping absolute positioning.
- App bar proportions were rebalanced: compact inline title/badge, 42px language/settings controls, consistent user card sizing, and responsive layout.

## Managed Geography business changes
- Provider Service Areas no longer accept suburb/state/postcode/latitude/longitude/radius inputs.
- Provider Service Areas use `GET /service-areas/options?search=...` via the shared managed geography selector.
- `POST /service-areas` now sends only `geographyAreaId` and `isActive`.
- Existing provider service areas display managed location snapshots as read-only information and do not render radius as meaningful coverage.
- Previously selected geography IDs are removed from the provider add-area selector.
- Customer provider search sends `geographyAreaId` to `/providers` instead of filtering the downloaded list locally.
- Customer provider-service search sends `geographyAreaId` to `/provider-services` and recommendations.
- Customer-location/Hybrid service requests collect AddressLine1 + managed geography and send `serviceGeographyAreaId`; manual suburb/state/postcode fields were removed from that flow.
- Backend coverage validation messages are surfaced as business/form errors.
- Provider Profile business address fields were intentionally left unchanged.

## Consent and pricing
- Health summary consent automatically enables Pet Profile consent.
- Turning Pet Profile consent off also turns Health Summary consent off.
- Provider request detail hides contact/pet detail when consent was not granted.
- Fixed and From pricing require a base price > 0 in UI and save validation.
- Quote pricing sends no misleading numeric base price and displays Request Quote semantics.

## Build/validation notes
- TypeScript syntax/transpile diagnostics checked for all 73 TS source files.
- All SCSS files passed brace-balance validation.
- All Angular HTML templates passed structural tag-balance validation.
- All i18n JSON files parse successfully.
- A full Angular production build could not be executed in this environment because `npm ci` could not complete before the environment transport timeout. No successful build is claimed.
