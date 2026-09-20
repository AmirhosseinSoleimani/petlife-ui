# Pet Lovers Frontend — Agent Engineering Guardrails

> **Purpose:** This file is an execution contract for AI coding agents and developers working in this repository.
>
> The primary goal is to prevent regressions where a small requested change — especially a rename, copy change, API fix, or business-logic change — unintentionally modifies the visual system, responsive behavior, shared components, or unrelated features.
>
> **Repository:** `AmirhosseinSoleimani/petlife-ui`  
> **Baseline reviewed:** `develop` at commit `b9ff6f001f6aa024de2080c1f5fa90b0aae7ccab`  
> **Framework baseline:** Angular 13, TypeScript strict mode, SCSS  
>
> If the repository has moved beyond this baseline, inspect the current implementation before editing. The principles in this file still apply.

---

# 1. PRIME DIRECTIVE

## Preserve the current validated behavior and visual baseline.

For every task:

1. Change **only what the user explicitly requested**.
2. Prefer the **smallest possible diff**.
3. Do not perform opportunistic refactors.
4. Do not redesign unrelated UI.
5. Do not normalize, reformat, rename, or reorganize unrelated code.
6. Do not modify global CSS to solve a local problem unless the task explicitly requires a global design-system change.
7. Do not change business logic while doing UI work.
8. Do not change UI while doing a non-visual task.
9. Do not change public routes, API contracts, storage keys, selectors, or technical identifiers during a display-name/copy rename unless explicitly requested.
10. A successful implementation is one where the requested behavior changes and unrelated behavior remains unchanged.

## Zero-visual-regression rule

For tasks classified as:

- rename
- copy/text change
- translation change
- API fix
- model fix
- business-logic fix
- data mapping fix
- validation fix
- service-layer fix
- documentation
- configuration not related to UI

the acceptable unintended visual change is:

> **ZERO**

If a non-visual task causes a `.scss` change, global style change, shared visual component change, layout DOM change, or responsive change, treat that as a scope violation unless the user explicitly requested it.

---

# 2. TASK CLASSIFICATION IS MANDATORY

Before modifying code, classify the task into one of these categories.

| Task type | Default allowed scope | Default forbidden scope |
|---|---|---|
| Rename / branding copy | i18n values, visible title/copy constants | SCSS, layout, shared visual components, routes, storage keys, API URLs, selectors |
| Translation / copy | `assets/i18n/*`, literal view copy only if unavoidable | Layout, CSS, business logic |
| API / business fix | relevant service/model/component TS | CSS, layout, global styles |
| Local UI fix | target feature HTML/SCSS, existing shared components | unrelated pages, global theme, app shell |
| Shared component fix | one shared component + verified consumers | unrelated feature redesign |
| Responsive fix | target page/component responsive rules | application-wide breakpoint rewrite |
| Global design-system change | global tokens/styles only when explicitly requested | silent feature redesign |
| Architecture/refactor | explicitly named module/layer | visual behavior unless requested |
| Dependency/build task | package/build/config files | UI redesign or component cleanup |

### Scope expansion rule

If the requested task appears to require crossing into another category:

- do not silently expand the task;
- first try to solve it inside the original category;
- if crossing boundaries is genuinely necessary, keep the extra change minimal and explicitly report it;
- never use a small task as a reason to perform a larger cleanup.

---

# 3. CHANGE BUDGET: DEFINE THE FILES BEFORE EDITING

Before making changes, establish an expected file allowlist.

Example for an app display-name change:

```text
Expected files:
- src/assets/i18n/en.json
- src/assets/i18n/fa.json
- src/index.html   # only if browser/document title is part of the request
```

The exact list depends on the task, but the principle is mandatory.

After the implementation, run:

```bash
git diff --name-only
```

Every changed file must have a clear reason tied directly to the requested task.

If an unexpected file appears:

```text
STOP -> inspect -> revert unrelated change
```

Do not justify unrelated files after the fact.

### High-risk signal

For a text-only or rename task:

- any `.scss` file changed;
- `src/styles.scss` changed;
- `src/styles/**` changed;
- `app-shell.component.html` changed structurally;
- `app-shell.component.scss` changed;
- a shared component changed;
- `app-routing.module.ts` changed;
- `app.module.ts` changed;
- `angular.json` changed;
- `package.json` changed;

means the implementation is high-risk and should be reduced before completion unless the task explicitly requires those files.

---

# 4. RENAME SAFETY PROTOCOL — CRITICAL

This section exists because a display-name rename must never reset or destabilize the UI.

## 4.1 Never use blind repository-wide replacement

Do **not** perform an unrestricted operation equivalent to:

```text
replace every occurrence of "PetLife" with "Pet Lovers"
```

A repository string can be:

- visible application copy;
- translation text;
- a package/project identifier;
- CSS class;
- Angular selector;
- route;
- localStorage key;
- API identifier;
- directory name;
- file name;
- asset path;
- environment key;
- backend contract;
- analytics key;
- technical namespace.

These are not equivalent.

## 4.2 Search first, classify second, edit third

Use a search such as:

```bash
git grep -n -i -E "PetLife|Pet Life|petlife"
```

Classify every occurrence before changing it.

### A. Display copy — normally safe to rename

Examples:

```text
app.name translation value
page title visible to the user
login branding copy
browser title when explicitly requested
```

### B. Technical identifiers — DO NOT rename by default

Examples include:

```text
package/project name
Angular workspace/project key
folder names
file names
Angular selectors
component class names
CSS classes
route paths
query parameter names
API endpoints
request/response property names
localStorage/sessionStorage keys
environment keys
analytics/event keys
backend identifiers
deployment paths
CI identifiers
```

These must remain unchanged unless the user explicitly asks for a technical rename/migration.

## 4.3 Existing technical identifiers that must not be casually renamed

Examples in the current application include:

```text
petlife-ui
petlife.language
petlife:notifications-changed
app-shell
app-root
```

A visible brand rename does **not** imply that these technical identifiers should change.

## 4.4 Rename tasks must preserve DOM structure

When changing visible text:

Do not:

- add wrapper elements;
- remove wrapper elements;
- change class names;
- move nodes;
- change element type without necessity;
- change `routerLink`;
- change `(click)` handlers;
- change `*ngIf`;
- change `*ngFor`;
- change forms/bindings;
- change component inputs/outputs;
- modify grid/flex structure.

Why: current SCSS contains selectors that can depend on element structure, direct children, context, and class names. A text rename should not alter any of those contracts.

## 4.5 Rename Definition of Done

A display-name rename is complete only when:

- intended visible copy uses the new name;
- old visible copy is no longer shown where requested;
- technical identifiers remain stable unless explicitly migrated;
- `git diff --name-only` contains only expected files;
- no `.scss` file changed unless explicitly required;
- no layout HTML changed beyond literal text/key replacement;
- application builds successfully;
- desktop and mobile rendering remain unchanged except for natural text-width differences;
- English and Persian do not overflow or break layout.

---

# 5. CURRENT FRONTEND ARCHITECTURE

The repository currently follows this broad structure:

```text
src/app/
├── core/
│   ├── api/
│   ├── auth/
│   ├── guards/
│   ├── i18n/
│   ├── interceptors/
│   ├── models/
│   └── preferences/
│
├── features/
│   ├── admin/
│   ├── ai/
│   ├── auth/
│   ├── dashboard/
│   ├── emergency-vets/
│   ├── feedback/
│   ├── notifications/
│   ├── pets/
│   ├── profile/
│   ├── provider-panel/
│   ├── providers/
│   ├── reminders/
│   ├── requests/
│   ├── services/
│   └── sharing/
│
└── shared/
    ├── components/
    ├── layout/
    └── services/
```

## Ownership

### `core/`

Application-wide non-visual infrastructure and contracts.

Typical responsibilities:

- API access
- auth
- interceptors
- guards
- application models
- i18n
- user preferences

Do not put page-specific UI styling here.

### `features/`

Feature-owned UI and behavior.

A feature-specific visual change should normally remain inside the target feature.

### `shared/components/`

Reusable visual building blocks.

Changing a shared component potentially affects many routes and is therefore a regression-sensitive operation.

### `shared/layout/`

Application shell and global chrome.

Changes here affect the entire authenticated application and are high risk.

---

# 6. ROUTING AND MODULE STRUCTURE

The current project is Angular 13 and uses a central NgModule architecture.

Important files:

```text
src/app/app-routing.module.ts
src/app/app.module.ts
```

## Rules

Do not modify routing for:

- rename tasks;
- copy changes;
- local CSS fixes;
- simple API fixes;
- translation updates.

Do not modify `app.module.ts` unless a component/module/provider genuinely requires registration.

Do not use architecture modernization as part of an unrelated task.

Examples of forbidden opportunistic work:

```text
"While renaming the app I converted modules to standalone components."
"While fixing padding I reorganized routing."
"While fixing an API response I upgraded Angular."
```

These are separate tasks.

---

# 7. SHARED COMPONENTS ARE THE UI CONTRACT

The project already contains shared components including:

```text
app-badge
app-button
app-card
app-confirm-dialog
app-file-upload
app-input
app-loading-state
app-modal
app-page-header
geography-selector
workspace-preferences
```

Before creating a new common control, inspect these first.

## Use existing shared controls when appropriate

### Buttons

Prefer:

```html
<app-button variant="primary">...</app-button>
```

Available variants currently include:

```text
primary
secondary
danger
ghost
```

Do not create a new page-specific button design for a normal action if `app-button` is sufficient.

### Inputs

Prefer `app-input` for supported normal form controls.

It currently supports patterns for:

```text
text input
password input
textarea
select
checkbox
```

Do not create visually inconsistent form controls without a real feature requirement.

### Cards

Prefer `app-card` for standard application surfaces.

### Modals

Prefer `app-modal` for standard modal experiences.

It already includes:

- viewport positioning;
- body scroll locking;
- focus restoration;
- Escape handling;
- focus trapping;
- responsive mobile bottom-sheet behavior.

Do not replace it with an ad-hoc overlay for a normal modal.

### Confirmation dialogs

Prefer the existing confirmation dialog/service.

### Page header

Prefer `app-page-header` for standard page headings/actions where the existing pattern fits.

### Loading state

Prefer the existing application loading-state component where applicable.

---

# 8. SHARED COMPONENT CHANGE RULE

Before changing a shared component:

1. search all consumers;
2. understand whether consumers override or depend on its internals;
3. keep the public inputs/outputs backward compatible unless migration is explicitly requested;
4. validate representative consumer pages;
5. validate mobile;
6. validate RTL if the component contains directional layout;
7. validate dark/light theme where visual tokens are involved.

Example search:

```bash
git grep -n "<app-button"
git grep -n "<app-card"
git grep -n "<app-modal"
git grep -n "<app-page-header"
```

A local page problem should not be fixed by modifying a shared component unless the bug is genuinely shared.

---

# 9. STYLE OWNERSHIP — UNDERSTAND BEFORE EDITING

The application does not have one isolated styling layer.

Visual behavior is distributed across:

```text
src/styles.scss
src/styles/*.scss
src/styles/pages/*.scss
src/app/shared/**/*.scss
src/app/features/**/*.scss
```

This makes careless global CSS edits dangerous.

## Important global style files

Current important files include:

```text
src/styles.scss
src/styles/_admin-panel.scss
src/styles/_component-budget-overflow.scss
src/styles/_enterprise.scss
src/styles/_preferences.scss
src/styles/pages/_customer-pages.scss
src/styles/pages/_dashboard.scss
src/styles/pages/_emergency-vets.scss
src/styles/pages/_pets.scss
src/styles/pages/_provider-workspace.scss
```

## Critical cascade fact

`src/styles.scss` imports global partials and also contains later global rules.

Therefore:

> A selector added later in `styles.scss` can override styles emitted from imported partials.

Do not assume a feature component's apparent local style is the final style seen by the browser.

Before changing a visual property, search for every selector/property that may affect it.

---

# 10. PROTECTED UI FILES

Treat these as **protected**.

Do not edit them for a local or non-visual task unless there is a direct and explicit reason.

```text
src/styles.scss
src/styles/_enterprise.scss
src/styles/_preferences.scss
src/styles/_admin-panel.scss
src/styles/pages/*
src/app/shared/layout/app-shell/app-shell.component.html
src/app/shared/layout/app-shell/app-shell.component.scss
src/app/shared/components/*/*.scss
```

Also treat these configuration/architecture files as protected from unrelated tasks:

```text
angular.json
package.json
package-lock.json
src/app/app.module.ts
src/app/app-routing.module.ts
```

## Protected does not mean immutable

They can be changed when the requested task genuinely belongs there.

But when they are changed:

- the change must be intentional;
- impact must be understood;
- regression validation must be wider than a single page.

---

# 11. `app-shell` IS HIGH-RISK

The shell controls:

- sidebar
- responsive drawer
- topbar
- user actions
- language selector
- notification trigger
- preferences trigger
- content container
- global authenticated layout

The shell is styled from both:

```text
src/app/shared/layout/app-shell/app-shell.component.scss
src/styles.scss
```

This means shell changes can have cross-file cascade interactions.

## Rule

Do not modify `app-shell` for:

- app rename;
- page copy;
- normal feature implementation;
- local form spacing;
- local card spacing;
- local API behavior.

Only modify it when the task explicitly concerns application chrome/navigation/shell behavior.

---

# 12. DESIGN TOKENS ARE THE SOURCE OF TRUTH

The project already defines application variables in `src/styles.scss`.

Prefer tokens over new hard-coded values.

## Typography tokens

```scss
--font-family-base
--font-size-page-title
--font-size-section-title
--font-size-card-title
--font-size-body
--font-size-caption
--font-size-badge
--line-height-body
```

## Spacing scale

Use this scale by default:

```scss
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 20px;
--space-2xl: 24px;
--space-3xl: 32px;
```

For new or modified spacing, prefer these tokens instead of inventing arbitrary values.

Example:

```scss
/* preferred */
.panel {
  padding: var(--space-xl);
  gap: var(--space-lg);
}
```

Avoid:

```scss
/* avoid without a component-specific reason */
.panel {
  padding: 23px;
  gap: 17px;
}
```

Existing legacy values do not justify introducing more inconsistency.

## Surface and text tokens

```scss
--app-bg
--app-surface
--app-surface-soft
--app-text
--app-muted
--app-border

--color-bg
--color-surface
--color-surface-soft
--color-border
--color-border-strong
--color-text
--color-muted
```

## Semantic color tokens

```scss
--color-primary
--color-primary-dark
--color-primary-hover
--color-primary-soft

--color-accent
--color-accent-soft

--color-success
--color-success-soft

--color-warning
--color-warning-soft

--color-danger
--color-danger-soft

--color-info
--color-info-soft
```

## Radius tokens

```scss
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-pill: 999px;
```

## Shadow tokens

```scss
--shadow-soft
--shadow-medium
--shadow-elevated
--shadow-sm
--shadow-md
--shadow-glow
--shadow-premium
```

---

# 13. DO NOT HARD-CODE THE THEME

The application supports appearance preferences.

The current preference system applies attributes to the root document:

```text
data-theme
data-accent
```

Current accent options include:

```text
Teal
Coral
Blue
Purple
Green
```

Dark mode overrides application variables.

## Rule

If a color has a semantic token, use the token.

Bad:

```scss
.card {
  background: #ffffff;
  color: #17323a;
}
```

Better:

```scss
.card {
  background: var(--color-surface);
  color: var(--color-text);
}
```

Do not assume `#fff` is correct in dark mode.

Hard-coded colors may remain in legacy code, but new modifications should move toward semantic variables when the change can be made safely and locally.

Do not perform a repository-wide color refactor as a side effect of another task.

---

# 14. SPACING AND PADDING STANDARD

## Default principle

Spacing belongs to the nearest component that owns the visual relationship.

Examples:

- shell owns shell/content padding;
- page owns spacing between page sections;
- card owns its internal padding;
- form/grid owns gaps between its fields;
- shared button owns button padding;
- modal owns modal internal padding.

Do not compensate for one component's spacing by adding arbitrary negative margin or unrelated global padding.

## Standard spacing preference

Use:

```text
4
8
12
16
20
24
32
```

through the existing spacing tokens.

## Touch targets

Interactive controls should generally preserve a minimum usable target near `44px` where the application already follows that behavior, especially on mobile.

Do not reduce control height to solve density unless compact behavior is explicitly designed and tested.

---

# 15. RESPONSIVE CONTRACT

Responsive behavior is a required feature, not an optional cleanup.

The current application contains several established breakpoint families.

Common existing thresholds include:

```text
1279 / 1280
1024
900
860
767 / 768
760
640
620
560
480
430
390
```

## Do not invent breakpoints casually

When modifying an existing page:

1. inspect the breakpoints already used by that page/component;
2. reuse the closest existing breakpoint;
3. introduce a new breakpoint only when content behavior genuinely requires it.

For new general layouts, prefer alignment with the existing major bands:

```text
Desktop: >= 1024px
Tablet / compact desktop: 768px - 1023px
Mobile: < 768px
Small mobile refinements: <= 560px / <= 430px when required
```

## Required responsive CSS patterns

For grid columns, prefer:

```scss
grid-template-columns: repeat(3, minmax(0, 1fr));
```

not:

```scss
grid-template-columns: repeat(3, 1fr);
```

when child content can overflow.

Grid/flex children that contain dynamic content should often have:

```scss
min-width: 0;
```

Long content should be intentionally handled with one of:

```scss
overflow-wrap: anywhere;
word-break: normal;
text-overflow: ellipsis;
```

Choose based on UX; do not truncate important data accidentally.

## Horizontal overflow

The application globally limits horizontal overflow.

Do not use that as a way to hide responsive bugs.

Pages should not generate horizontal scrolling except intentionally scrollable structures such as large admin tables inside their dedicated wrapper.

---

# 16. RESPONSIVE VALIDATION VIEWPORTS

For a UI-affecting change, validate representative sizes.

Minimum recommended set:

```text
1440 x 900   desktop
1280 x 800   compact desktop
1024 x 768   shell/tablet boundary
768 x 1024   tablet
390 x 844    mobile
```

For very narrow layouts, also inspect approximately:

```text
375 x 812
```

Do not add a testing dependency just to capture screenshots unless the task asks for it.

If browser automation is already available, use it.

Otherwise manually inspect the affected route(s).

---

# 17. RTL AND INTERNATIONALIZATION ARE PART OF THE UI CONTRACT

The current `I18nService` supports:

```text
en -> LTR
fa -> RTL
```

It updates:

```text
document.documentElement.lang
document.documentElement.dir
```

## Directional CSS

Prefer logical properties.

Bad:

```scss
margin-left: 16px;
right: 12px;
padding-right: 24px;
```

Preferred:

```scss
margin-inline-start: var(--space-lg);
inset-inline-end: var(--space-md);
padding-inline-end: var(--space-2xl);
```

When direction-specific behavior is necessary, use existing patterns such as:

```scss
:host-context([dir='rtl']) ...
```

or a root RTL selector where appropriate.

## Text

If user-visible content belongs in i18n:

- add/update the English translation;
- add/update the Persian translation;
- do not leave one language with a stale brand name;
- do not restructure layout just to accommodate a translation.

Test both directions when visible text changes can affect layout.

---

# 18. DOM STRUCTURE IS A STYLE CONTRACT

Do not assume HTML wrappers are harmless.

Current styles use patterns such as:

```text
direct-child selectors
first/last child selectors
host-context
nested selectors
grid child placement
specific class combinations
```

Therefore:

> DOM restructuring is a UI change even when no SCSS file changes.

For non-UI tasks, preserve:

- element hierarchy;
- classes;
- semantic component tags;
- projection points;
- child order;
- structural directives.

---

# 19. CSS SCOPING RULES

## Feature-specific styles

Keep feature-specific behavior in the feature's own SCSS where possible.

## Global page partials

If global feature styles are necessary, scope them to a component host.

Example:

```scss
app-dashboard {
  .metric-card {
    ...
  }
}
```

Avoid adding a generic global rule such as:

```scss
.metric-card {
  ...
}
```

if that class can appear elsewhere.

## Generic selectors

Do not add broad new global rules for:

```text
.card
.panel
.header
.title
.actions
.row
.grid
button
input
```

unless the rule is intentionally part of the global design system.

## `!important`

Do not add `!important` as a quick fix.

If it appears necessary:

1. inspect the cascade;
2. find the competing selector;
3. solve at the correct ownership layer.

An exception must be deliberate and documented.

---

# 20. COMPONENT STYLE BUDGETS

Production configuration currently defines an Angular component-style budget:

```text
maximumWarning: 12kb
maximumError: 16kb
```

The repository already contains:

```text
src/styles/_component-budget-overflow.scss
```

This file exists to hold host-scoped styles moved out of component bundles when necessary.

## Rules

Do not use this file as a dumping ground.

Only move styles there when:

- the component style budget genuinely requires it;
- the block remains scoped to the component host;
- moving the CSS does not alter cascade behavior unexpectedly;
- responsive behavior is preserved.

A budget problem does not authorize redesign.

---

# 21. ACCESSIBILITY MUST NOT REGRESS

Preserve or improve:

- keyboard access;
- `focus-visible`;
- labels;
- dialog semantics;
- ARIA labels where already used;
- Escape behavior in modal/drawer;
- focus trapping/restoration;
- disabled state behavior;
- reduced motion support.

The global stylesheet already supports:

```css
@media (prefers-reduced-motion: reduce)
```

Do not introduce essential interaction that depends exclusively on animation.

---

# 22. MODAL RULES

The shared `app-modal` handles important behavior.

Do not create a custom fixed overlay for a routine modal if the shared modal fits.

When modifying modal content:

- do not alter global body-scroll behavior;
- do not add transforms to ancestors that break fixed positioning;
- ensure mobile max-height works;
- keep content scroll inside the modal body;
- preserve focus and Escape behavior.

There is already global handling for `body.app-modal-open`. Do not duplicate it per feature.

---

# 23. FORM RULES

Prefer existing shared input/button components for normal controls.

When native controls are necessary:

- use theme tokens;
- preserve focus state;
- preserve minimum usable control height;
- keep width responsive;
- use logical spacing properties;
- avoid fixed pixel widths that overflow mobile.

Do not change validation behavior as part of a visual-only task.

Do not change form model names as part of a style task.

---

# 24. IMAGE AND MEDIA RULES

For responsive images:

```scss
max-width: 100%;
```

For thumbnails/cards:

- use `object-fit: cover` where cropping is intended;
- use `aspect-ratio` where stable proportions are important;
- do not force arbitrary fixed dimensions that distort uploaded pet/provider images;
- preserve graceful fallback behavior.

Do not replace backend image logic during a UI-only task.

---

# 25. BUSINESS LOGIC PROTECTION

Visual work must not silently modify:

- API endpoints;
- auth flow;
- role checks;
- guards;
- request payload shape;
- response mapping;
- validation rules;
- persistence keys;
- notification events;
- routing;
- form submission behavior.

Examples of sensitive current behavior/identifiers include:

```text
petlife.language
window event: petlife:notifications-changed
role-based customer/provider/admin navigation
user preference theme/accent application
```

A branding change is not a technical migration.

---

# 26. API TASKS MUST NOT REDESIGN UI

When fixing an API/data issue:

Allowed examples:

```text
change response mapping
handle null safely
update model interface
fix endpoint parameter
handle fieldErrors
correct loading/error state transitions
```

Not automatically allowed:

```text
redesign the card
change page padding
change grid
change colors
replace shared input
rewrite modal layout
```

If a data fix reveals a pre-existing UI issue, keep that separate unless the user explicitly asks to fix both.

---

# 27. LOCAL UI TASKS MUST STAY LOCAL

For a request such as:

```text
"Fix spacing on the provider services page"
```

start with:

```text
src/app/features/services/provider-services-page/*
```

and relevant existing shared components.

Do not begin by editing:

```text
src/styles.scss
```

A global fix is appropriate only when the underlying bug is genuinely global and the same behavior should change everywhere.

---

# 28. GLOBAL DESIGN-SYSTEM CHANGES REQUIRE EXPLICIT INTENT

The following are global changes:

- application primary color;
- spacing scale;
- typography scale;
- app shell dimensions;
- global page padding;
- global button design;
- global input design;
- global card radius/shadow;
- global breakpoint strategy;
- theme behavior;
- dark mode;
- shared modal behavior.

Do not make these changes because a single screen looks slightly inconsistent.

A local inconsistency should first be corrected locally to match the existing system.

---

# 29. DO NOT "CLEAN UP" LEGACY CSS DURING A FEATURE TASK

This repository contains both modern token-based styling and older hard-coded styles.

Do not attempt to normalize all legacy code while implementing an unrelated change.

Safe approach:

```text
touch only the lines required for the task
```

Unsafe approach:

```text
"I noticed old colors, so I converted the entire page while fixing one button."
```

Large cleanup requires its own refactor task and regression plan.

---

# 30. SOURCE CONTROL RULES

The repository already documents its Git flow in:

```text
docs/development/git-flow.md
```

Current flow:

```text
working branch
  -> develop
  -> test
  -> production
```

Normal work should branch from the latest `develop`.

Examples:

```text
feature/*
fix/*
refactor/*
chore/*
test/*
```

Do not develop directly on:

```text
develop
test
production
```

Do not bypass the normal promotion flow.

---

# 31. BEFORE-CHANGE CHECKLIST

Before editing:

```text
[ ] I understand the exact requested outcome.
[ ] I classified the task.
[ ] I identified the owning feature/component.
[ ] I searched for existing shared components.
[ ] I searched for existing styles affecting the target.
[ ] I identified protected files.
[ ] I defined an expected changed-file list.
[ ] I checked whether this is visual or non-visual.
[ ] I will not refactor unrelated code.
```

For rename/copy work:

```text
[ ] I searched all occurrences first.
[ ] I separated display copy from technical identifiers.
[ ] I will not use blind mass replacement.
[ ] I will not touch SCSS unless explicitly required.
[ ] I will preserve DOM structure.
```

---

# 32. DIFF DISCIPLINE

During and after the change, repeatedly inspect the diff.

Use:

```bash
git status --short
git diff --stat
git diff --name-only
git diff
```

For a rename/copy task, specifically inspect whether any of these changed:

```bash
git diff --name-only | grep -E "\.scss$|styles\.scss|app-shell|app-routing|app\.module|angular\.json|package(-lock)?\.json"
```

If output appears unexpectedly, investigate and revert unrelated edits.

## No unrelated formatting

Do not run a formatter across unrelated files.

Do not normalize line endings repository-wide.

Do not sort imports in unrelated files.

Do not re-indent entire templates for a one-line change.

A clean diff is part of correctness.

---

# 33. BUILD VALIDATION

Before declaring work complete, run:

```bash
npm run build -- --configuration production
```

The change is not complete if it introduces:

- build errors;
- TypeScript errors;
- Angular template errors;
- new style budget errors;
- new avoidable warnings caused by the change.

If tests are relevant and the environment supports them, run the appropriate test command.

Never claim validation that was not actually performed.

---

# 34. VISUAL REGRESSION VALIDATION

## For a local UI change

Validate:

```text
target page on desktop
target page on tablet boundary
target page on mobile
LTR
RTL when directional layout/text is involved
light theme
dark theme when token/surface colors are involved
```

## For a shared component change

Validate representative consumers, not only the demo/first route.

## For an app-shell/global style change

Validate representative routes across:

```text
customer workspace
provider workspace
admin workspace
auth page if affected
desktop
mobile drawer
LTR
RTL
```

## For a rename/copy change

At minimum validate the routes where the changed copy appears.

Check that longer text does not:

- overflow;
- wrap into controls incorrectly;
- enlarge fixed-height containers;
- cover icons;
- break topbar;
- break mobile cards.

---

# 35. REGRESSION MATRIX

Use this minimum matrix.

| Change type | Build | Desktop | Mobile | RTL | Dark mode | Multi-page sweep |
|---|---:|---:|---:|---:|---:|---:|
| Text/rename | Required | Affected page | Affected page | If translated/directional | If visible on themed surface | Not usually |
| API/business | Required | Functional check | If flow used on mobile | If UI state changes | If UI state changes | Related flow |
| Local UI | Required | Required | Required | Required when relevant | Required when colors/surfaces touched | No |
| Shared component | Required | Required | Required | Required | Required | Required |
| App shell/global CSS | Required | Required | Required | Required | Required | Required |
| Design-system/theme | Required | Required | Required | Required | Required | Required |

---

# 36. DEFINITION OF DONE

A task is done only when all applicable items are true.

## Scope

```text
[ ] Only requested behavior changed.
[ ] No unrelated feature was refactored.
[ ] Changed files match the planned scope.
[ ] No generated/build artifact was committed unintentionally.
```

## UI

```text
[ ] No unexpected layout shift.
[ ] No horizontal overflow.
[ ] No broken grid/flex behavior.
[ ] Padding/gaps follow existing design tokens/patterns.
[ ] Colors use semantic tokens where appropriate.
[ ] Mobile layout is verified.
[ ] RTL is preserved.
[ ] Long text does not break layout.
[ ] Dark mode is preserved if applicable.
```

## Components

```text
[ ] Existing shared components were reused where appropriate.
[ ] Shared component API was not broken.
[ ] No duplicate common component was introduced.
```

## Behavior

```text
[ ] Routes still work.
[ ] Click handlers still work.
[ ] Form bindings still work.
[ ] API behavior is unchanged unless requested.
[ ] Role-based behavior is unchanged unless requested.
[ ] Storage keys/events/contracts are unchanged unless requested.
```

## Quality

```text
[ ] Production build passes.
[ ] No new task-caused warning remains unexplained.
[ ] Diff is minimal and reviewable.
[ ] Validation performed is reported accurately.
```

---

# 37. REQUIRED AGENT COMPLETION REPORT

At the end of every implementation, report exactly these categories:

## Changed

List the files intentionally changed and why.

## Not changed

Explicitly state important protected areas that were intentionally preserved.

Example:

```text
Not changed:
- global styles
- app shell
- routing
- API contracts
- shared visual components
```

## Validation

State what was actually run/checked.

Example:

```text
Validation:
- production build passed
- checked dashboard at 1440px
- checked dashboard at 390px
- checked English and Persian
```

Do not say "all good" without stating what was verified.

## Risk

State any remaining risk honestly.

For a simple rename with no technical changes, expected risk should be low.

---

# 38. SAFE EXAMPLE — DISPLAY NAME CHANGE

Request:

```text
Rename visible application brand from "PetLife" to "Pet Lovers".
Do not change business logic.
```

Correct approach:

1. search all occurrences;
2. identify visible copy;
3. update translation values such as `app.name`;
4. update browser title only if requested/appropriate;
5. leave technical identifiers untouched;
6. do not change SCSS;
7. do not restructure templates;
8. build;
9. inspect visible brand locations desktop/mobile;
10. report exact diff.

Expected style diff:

```text
NONE
```

Expected business-logic diff:

```text
NONE
```

---

# 39. UNSAFE EXAMPLE — DISPLAY NAME CHANGE

The following is not acceptable:

```text
- renamed app
- reorganized login markup
- changed brand colors
- adjusted topbar padding
- replaced sidebar logo implementation
- renamed CSS classes
- changed localStorage keys
- renamed package
- cleaned old global styles
```

Even if each individual change appears reasonable, together they create a regression-prone unrelated redesign.

That is a scope failure.

---

# 40. SAFE EXAMPLE — LOCAL PADDING BUG

Request:

```text
Fix excessive padding in the pet transfer form on mobile.
```

Correct process:

1. inspect the pet-transfer template and SCSS;
2. inspect global rules that affect the same element;
3. identify which owner is responsible;
4. change the smallest local rule;
5. reuse spacing tokens;
6. test desktop to ensure it did not change unintentionally;
7. test mobile;
8. test RTL if logical spacing is involved.

Do not change the global spacing scale.

---

# 41. SAFE EXAMPLE — API FIX

Request:

```text
Fix the provider list response mapping.
```

Expected primary files:

```text
service / model / relevant component TS
```

Unexpected and normally forbidden:

```text
provider card SCSS
global styles
app shell
theme
page padding
```

Functional fixes must not become visual refactors.

---

# 42. WHEN A TASK STARTS TO GROW

If a small task begins touching many systems, assume one of these is happening:

1. scope is being misunderstood;
2. an architectural boundary is being crossed unnecessarily;
3. a broad refactor is being performed implicitly;
4. a technical identifier is being confused with display copy;
5. global CSS is being used to patch a local issue.

Before continuing:

```text
reduce the diff
restore unrelated files
return to the owning component
```

For text-only tasks, touching many source files or any protected global UI file is a strong warning signal.

---

# 43. FILES AND DIRECTORIES THAT MUST NEVER BE MODIFIED AS SIDE EFFECTS

Do not modify or commit unrelated:

```text
dist/
node_modules/
generated build output
temporary ZIP archives
IDE files
OS files
coverage output
cache files
```

Do not update `package-lock.json` unless dependencies actually changed.

Do not modify archived source ZIPs as a substitute for modifying source files.

---

# 44. NO DEPENDENCY ADDITIONS FOR SIMPLE UI WORK

Do not add:

- a CSS framework;
- UI library;
- icon library;
- animation library;
- state-management library;
- test framework;
- formatting tool;

for a small feature/fix unless explicitly requested and justified.

Existing project patterns should be preferred.

---

# 45. RESPONSIBLE REFACTORING

Refactoring is allowed when the task is explicitly a refactor.

A safe refactor must:

- preserve behavior;
- preserve visible UI unless visual change is part of the task;
- be split from feature work when practical;
- have clear regression validation;
- avoid mixing naming, formatting, dependency upgrades, and feature changes in one diff.

---

# 46. DESIGN CONSISTENCY RULE

When implementing new UI:

Do not invent a new visual language.

Derive from:

```text
existing app shell
shared app-button
shared app-input
shared app-card
shared app-modal
shared app-page-header
existing design tokens
existing dashboard/customer/provider/admin patterns
```

Use the existing application's:

- radii;
- shadows;
- semantic colors;
- spacing scale;
- typography hierarchy;
- focus behavior;
- responsive behavior.

Consistency is more important than novelty for routine feature development.

---

# 47. MINIMUM-DIFF DECISION TREE

Use this mental model before editing:

```text
Can the task be solved by changing data/copy only?
  YES -> do not touch HTML structure or SCSS.
  NO
   |
Can it be solved inside the owning feature?
  YES -> do not touch global styles/shared shell.
  NO
   |
Is the issue genuinely in a shared component?
  YES -> change shared component and validate all representative consumers.
  NO
   |
Is the issue genuinely global/design-system level?
  YES -> change protected global styles only with wide regression validation.
```

Always choose the highest branch in this tree that solves the problem.

---

# 48. FINAL NON-NEGOTIABLE RULES

1. **Small task = small diff.**
2. **Rename is not redesign.**
3. **Copy change is not architecture change.**
4. **API fix is not UI cleanup.**
5. **Local UI bug is not a global CSS rewrite.**
6. **Do not touch protected files without a direct reason.**
7. **Do not mass-replace technical identifiers during branding work.**
8. **Preserve DOM structure for non-UI work.**
9. **Use existing design tokens.**
10. **Reuse shared components.**
11. **Responsive behavior must be verified.**
12. **RTL must not regress.**
13. **Dark/theme behavior must not regress.**
14. **Inspect the final diff before completion.**
15. **Build before completion.**
16. **Never claim validation that was not performed.**
17. **Never fix unrelated things "while here."**
18. **The user's requested scope is the boundary.**

---

# 49. AGENT ACKNOWLEDGEMENT

Before changing this repository, the agent should internally confirm:

```text
I will preserve the current validated UI and business behavior.
I will make the smallest change that satisfies the request.
I will not alter unrelated UI, global styles, shared components, routes,
technical identifiers, API contracts, or architecture unless explicitly required.
I will inspect my final diff and validate the affected surfaces before completion.
```

If the implementation does not satisfy this contract, it is not ready to merge.
