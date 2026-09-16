# PetLifeAU Frontend — Backend Alignment 2026-09-16

## Backend baseline

- Repository: `AmirhosseinSoleimani/petlifeau`
- Branch: `backup-before-pkges`
- HEAD reviewed: `18f6d24364b4797f926fc02771996729ca70fa41`
- Includes parent business change: `f95696098dcf597880ff89b2d729599728d6349d`

## Backend contract/business alignment

### Validation and error handling
- `ApiResponse<T>` supports backend `fieldErrors`.
- Validation errors are preserved per field and normalized centrally by the HTTP interceptor.
- Dynamic Persian formatting translates known field names and common backend validation messages while keeping the exact offending field visible.
- Existing consumers that still read `errors[]` continue to work.

### Sydney managed geography
- Customer profile supports bidirectional Sydney lookup:
  - `GET /geography/by-postcode/{postcode}`
  - `GET /geography/by-suburb/{suburb}`
- Single lookup matches auto-fill suburb/postcode/city/state/country; multiple matches are selectable.
- Provider Service Areas use `GET /service-areas/options` and create only with `geographyAreaId + isActive`.
- Provider discovery and provider-service discovery use managed `geographyAreaId` filters.
- At-customer/Hybrid requests collect `serviceGeographyAreaId` instead of relying on manually entered suburb/state/postcode for coverage authorization.
- Admin Geography follows the current City/Suburb/State/Postcode/Country contract and 4-digit postcode validation.

### Pet ownership transfer
New customer workflow added for:
- create short-lived transfer code,
- list current/used/revoked/expired transfer codes,
- revoke active code,
- preview recipient,
- transfer a selected pet using `POST /pets/{petId}/transfer`.

### In-app notifications
New notification center added for:
- list all/unread notifications,
- unread count in the application header,
- mark one notification read,
- mark all read,
- follow notification action paths.

Pet-transfer notifications are presented with localized Persian copy when Persian is active.

### Provider/customer marketplace changes
- Provider request detail shows both email and mobile when contact consent allows them.
- Health consent depends on Pet Profile consent in the request UI.
- `Fixed` and `From` pricing require a positive base price before save.
- Provider/service discovery UI no longer exposes obsolete manual radius/location controls where managed Geography is authoritative.

### Upload alignment
- JFIF added to supported image formats where backend accepts JPEG images.
- Frontend size validation aligned with backend business limits:
  - Pet profile image: 5 MB
  - Provider gallery: 8 MB
  - Health attachment: 10 MB
  - Expense receipt: 10 MB
  - Provider document: 12 MB

## Localization and direction
- Active languages intentionally limited to English (`en`) and Persian (`fa`).
- `html[dir]` and `lang` switch with the selected language.
- Persian renders RTL and English LTR.
- Direction-sensitive input types such as email, tel, URL, numbers and dates remain readable.
- All statically referenced translation keys are present in both `en.json` and `fa.json`.
- Previously hard-coded Admin UI copy was moved into the translation layer.
- Generated/fallback Persian strings were polished so ordinary UI copy does not remain mixed Persian/English; brand names and file-format acronyms are intentionally preserved.

## Responsive UI
- Shared responsive guards cover grids, forms, split layouts, filter bars, tables and action rows.
- New Notifications and Pet Transfer screens collapse cleanly to one column on smaller screens.
- Managed geography selectors and request/provider filtering layouts are mobile-safe.

## Validation performed
- TypeScript syntax/transpile validation: 76 source files, 0 syntax errors.
- Angular HTML structural tag validation: 0 structural issues.
- SCSS/CSS brace validation: 0 issues.
- i18n JSON parsing: successful.
- Static translation-key coverage: no missing EN/FA keys for detected template/component references.
- Full `ng build` was attempted, but dependency installation (`npm ci`) could not finish within the execution environment transport limit; therefore no successful Angular production build is claimed.

## Packaging
The delivered ZIP is source-only. Partial `node_modules` and stale pre-existing `dist` output are excluded so the package cannot be mistaken for a verified production build.
