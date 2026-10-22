# REV-07 — Angular integration handoff / NO-GO

## Verified frontend repository (not the backend repository)
- Actual frontend: `AmirhosseinSoleimani/petlife-ui`, Angular 13 / TypeScript 4.4 / NgModule, develop `dd12248776aea2fb35cf0657c8d75ee2abd6ee67`.
- Backend: `AmirhosseinSoleimani/petlifeau`, feature `dee4818a3cbd1133d2a6cda998a7eeee907f083a`.
- UI branch: `feature/provider-reviews-independent-service`; no direct writes to frontend `develop`.
- `/api/providers/{id}` returns `ProviderProfileResponse.Id` (Profile ID) independent of `UserId`. Reviews read profile IDs only; never guess account/profile identity from other fallback IDs.
- Existing Angular API URL is environment.apiBaseUrl; production /api. The new service ONLY requests /api/provider-reviews/v1/... at the same API facade. This route has **not** been verified as mapped by production BFF/gateway; backend Host supplies route source, not proof of live routing.

## Shipped fail-closed UI slice
- Dedicated typed interfaces for REV-05 ReviewPublicV1, RatingSummary, owner history, moderation/appeal and mutation contracts.
- One injectable typed client using HttpClient /api facade, with Idempotency-Key, If-Match and X-Reply-Version for mutations. No caller-supplied CustomerUserId, ProviderUserId, verified boolean or session proof.
- Both environment configurations default **readEnabled=false**, **customerEnabled=false**, **providerEnabled=false**, **moderationEnabled=false**, **commentOnlyApproved=false**.
- Provider details modal renders customer review summary, 1–5 histogram, published comments, official published replies, bounded cursor pagination, loading/empty/error/unrated states. Uses Angular interpolation, not innerHTML.
- Gated customer history route with edit/withdraw UI and accessible native radio choice, explicit state handling and no optimistic publication. No customer review submission action is enabled: eligibility lookup currently returns false/unavailable and actual Bookings producer is unapproved.
- HTTP contract test source verifies disabled requests issue zero network traffic and that writes use If-Match and Idempotency-Key.

## Still blocked — MUST NOT activate flags
1. REV-03 to REV-06 remain NO-GO: source-only tests not green, PostgreSQL migrations not proven, signed Bookings/Providers evidence absent, live Users permission not provisioned, write handlers still throw Unavailable.
2. Backend `ProviderRatingSummaryV1` has only ratingCount/averageRating/starCounts. It does not provide projection freshness or verified-review marker. Do not display invented status or badge. Backend pagination is only stable cursor order, no approved sort variants; UI offers server-side rating filter only. Future sorting requires additive approved API contract.
3. Backend API returns source-module records from its own Host. The actual production API facade/BFF must explicitly approve one route ownership, preserve auth/session validation, add service identity and verify envelope and error status behavior. Do not proxy blindly to an untrusted host or register two public controllers.
4. Provider official reply mutation requires owner-authorized ProviderProfile mapping, dedicated Users permission, server moderation of official reply. No review collection scoped to current Provider exists yet. UI intentionally does not invent a provider reply management page from an account ID.
5. Admin moderation requires a live permission-aware Users decision. Host's moderator policy hard-denies. No reliable frontend permission model beyond local JWT role, which is inadequate. Admin route and privileged detail must not be enabled until approved API/guard scope; frontend role-only hiding is not authorization.
6. Report/appeal workflow needs approved moderation/report dedup + abuse throttling, reviewed reason catalog and evidence retention. No enabled reporting dialogs or fake success.
7. Customer create/edit/withdraw must be gated by product policy windows from authoritative backend. The current frontend history edit slice is not released because server-side policies are unresolved. Preserve the original idempotency key when retrying the same request.
8. Complete review profile route integration once actual ProviderProfileId availability is guaranteed. Verified Provider trust badges are not customer review attestations.

## Backlog by dependency
- P0: backend API/composition/BFF owner signs contracts, stable envelope, features, role/permission grants, completion proof, moderation and rate limits; run actual HTTP contract tests.
- P1: approved policy/eligibility DTO and live customer create flow; conditionally display submit action only after authoritative eligible=true; no local status inference.
- P2: server-scoped provider inbox and reply history; admin queue/appeal permission read; report/dialog with dedup; route-guard tests and accessible focus on modal changes.
- P3: approved verified marker + freshness DTOs, sorting enum/contract, i18n keys for en/fa/es/fr, loading and error UX, monitor stale projections.
- P4: execute npm ci / npm run build / ChromeHeadless Karma; real BFF 401, 403, 404, 409, 422, 429, 503 tests; axe-core WCAG 2.2 AA, mobile 320/375/768/1280, RTL and smoke/regression.

## Verification
GitHub connector writes were successful. The local build container cannot resolve github.com to clone, so `npm ci`, Angular production build, Jasmine, browser and accessibility tests have NOT run. Source inspection is not a claim of compile/test PASS.

**Release gate: NO-GO.** UI feature flags remain false; do not merge as fully functional UX.
