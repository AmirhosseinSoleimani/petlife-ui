# یادداشت انتشار - 2026-09-16

این نسخه روی baseline فرانت‌اند `b46a8b2` ساخته شده است.

## اصلاحات اصلی

- رفع نمایش کلیدهای خام ترجمه مانند `auth.signIn` و تکمیل همگام‌سازی کلیدهای مصرف‌شده در زبان‌های انگلیسی و فارسی.
- اضافه شدن مدیریت خطای سراسری API با پشتیبانی از `fieldErrors`، وضعیت HTTP، خطاهای شبکه، انقضای session و `X-Trace-Id`.
- جلوگیری از نمایش خطای کاذب برای فایل‌های اختیاری ترجمه (`*.overrides.json`).
- تبدیل Geography به تجربه‌ی postcode-first؛ با وارد کردن کدپستی ۴ رقمی سیدنی، محله از API استخراج می‌شود.
- انتخاب خودکار محله در حالت تک‌نتیجه و نمایش گزینه‌های محله در کدپستی‌های چندمحله‌ای.
- اعمال UX جدید Geography در Service Area، Customer Profile، Provider Profile و Admin Geography.
- انتقال Postal Code به قبل از Suburb/City/State در فرم‌های مرتبط.
- اصلاح نمایش Statusها و fallbackهای Dashboard برای عبور از i18n.

## کنترل کیفیت انجام‌شده

- بررسی syntax همه فایل‌های TypeScript موجود در `src/app`.
- بررسی ساختار تمام templateهای HTML.
- مقایسه کلیدهای i18n مورد استفاده با هر دو فایل `en.json` و `fa.json`؛ کلید missing باقی نمانده است.
- `git diff --check` بدون خطا.

## محدودیت Build این محیط

اجرای کامل `npm run build` در runtime حاضر به دلیل نبود package cache کامل برای `zone.js` ممکن نشد. سورس پروژه و `package-lock.json` دست‌نخورده و آماده‌ی اجرای `npm ci && npm run build` در محیط توسعه/CI دارای دسترسی به dependencyها است.
