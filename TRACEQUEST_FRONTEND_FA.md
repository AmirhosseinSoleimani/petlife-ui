# پیاده سازی TraceQuest در Pet Lovers UI

## مسیر دسترسی

TraceQuest فقط برای Admin در مسیر زیر قابل دسترسی است:

```text
/admin/tracequest
```

Feature به صورت Lazy Loaded پیاده سازی شده تا SignalR و کدهای observability وارد bundle اولیه کاربران عادی نشوند.

## قابلیت های UI

- وضعیت اتصال Trace Store / Jaeger و latency آن
- وضعیت realtime SignalR و reconnect
- KPIهای Total, Error Rate, Average, P50, P95, P99, Max, Slow و Incomplete
- بازه زمانی 15m / 30m / 1h / 6h / 24h / Custom
- فیلتر Service / Status / Operation / Search / Minimum Duration / Limit
- Live trace stream
- Trace list و Trace detail
- Span waterfall
- Span attributes و events
- Operation hotspots
- Service statistics
- Dependency topology برای service/database/messaging/external
- Auto refresh هر 30 ثانیه در کنار realtime
- Responsive layout
- RTL مناسب برای فارسی
- نمایش graceful خطای 403 / 429 / 503

## Backend Contract استفاده شده

```text
GET /api/tracequest/traces
GET /api/tracequest/traces/{traceId}
GET /api/tracequest/services
GET /api/tracequest/kpis
GET /api/tracequest/operations
GET /api/tracequest/service-stats
GET /api/tracequest/topology
GET /api/tracequest/health/details
GET /api/tracequest/config
WS  /api/tracequest/live
```

## Build

از root پروژه:

```bash
npm ci
npm run build
```

خروجی production:

```text
dist/pet-lovers-ui
```

## نکته عملیاتی

اگر Jaeger هنوز نصب یا فعال نشده باشد، صفحه TraceQuest وضعیت Trace Store را Offline نشان می دهد. این موضوع نباید بخش های عادی Pet Lovers را از کار بیندازد.
