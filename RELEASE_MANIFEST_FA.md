# PetLifeAU - خروجی اصلاحات 2026-09-16

## نسخه‌ها

- Backend base: `backup-before-pkges` @ `18f6d24364b4797f926fc02771996729ca70fa41`
- Frontend baseline commit: `b46a8b2 feat(frontend): align UI with latest backend contracts`
- Frontend fix commit: `9727ca2 fix(frontend): harden errors, i18n, and postcode lookup`

## Frontend

- رفع نمایش کلیدهای خام ترجمه مانند `auth.signIn`.
- تکمیل تمام کلیدهای i18n مصرف‌شده در `en/fa`.
- مدیریت خطای سراسری API با `fieldErrors`, HTTP status و `X-Trace-Id`.
- اصلاح status/title/buttonهای عبورنکرده از ترجمه.
- Geography به‌صورت postcode-first در Admin Geography، Customer Profile، Provider Profile و selectorهای مشترک.
- lookup مستقیم کدپستی سیدنی و پرکردن خودکار suburb در حالت تک‌نتیجه؛ در کدپستی‌های چندمحله‌ای انتخاب محله نمایش داده می‌شود.

## Backend Patch

Patch دقیق و guard شده روی SHA بالا:

- Atomic شدن Pet + DynamicValues.
- رفع Verification resend cooldown بعد از delivery failure.
- کنترل one-to-one Reminder/HealthRecord در business layer.
- Transactional شدن Replace Availability.
- Serializable شدن Booking confirmation برای Capacity.
- Unique DB guard برای ServiceArea provider+geography به همراه migration پاک‌سازی duplicateهای قبلی.
- ذخیره Postcode واقعی Geography در ServiceArea.
- Race-safe شدن UserPreference upsert و ProductEvent dedup.
- Transactional شدن Renew/Review/Verification/Expiry و Trust Badge refresh.

## QA انجام‌شده

Frontend:
- TypeScript syntax: PASS برای 72 فایل.
- HTML structural check: PASS برای 48 template.
- i18n audit: 1213 کلید مصرف‌شده، 0 missing؛ `en/fa = 1707/1707`.
- `git diff --check`: PASS.

Backend patch:
- Python syntax: PASS.
- Exact-source patch self-test: PASS برای 29 replacement و 3 فایل جدید.

## محدودیت محیط

اتصال GitHub این runtime read-only است و clone مستقیم نیز DNS ندارد؛ بنابراین backend روی remote تغییر یا push نشده و به‌صورت patch قابل اعمال تحویل داده شده است. همچنین build کامل Angular به علت نبود cache پکیج `zone.js` در این runtime قابل اجرا نبود؛ سورس برای `npm ci && npm run build` در محیط دارای dependencyها آماده است.
