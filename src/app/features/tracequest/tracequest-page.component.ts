import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { I18nService } from '../../core/i18n/i18n.service';
import { TraceQuestApiService } from './tracequest-api.service';
import { RealtimeState, TraceQuestRealtimeService } from './tracequest-realtime.service';
import {
  TraceDetail,
  TraceFilters,
  TraceKpis,
  TraceOperationStat,
  TraceQuestClientConfiguration,
  TraceServiceStat,
  TraceSpan,
  TraceSpanEvent,
  TraceStoreHealth,
  TraceSummary,
  TraceTopology,
  TraceTopologyConnection,
  TraceTopologyNode,
  TraceTopologyPoint
} from './tracequest.models';

type TraceQuestTab = 'overview' | 'traces' | 'services' | 'topology';
type TimePreset = '15m' | '30m' | '1h' | '6h' | '24h' | 'custom';

const EMPTY_FILTERS: TraceFilters = {
  serviceName: '',
  operation: '',
  status: '',
  search: '',
  minDurationMs: null,
  startTimeUtc: null,
  endTimeUtc: null,
  limit: 100
};

const EMPTY_KPIS: TraceKpis = {
  totalTraces: 0,
  incompleteTraces: 0,
  healthyTraces: 0,
  slowTraces: 0,
  errorTraces: 0,
  errorRatePercent: 0,
  averageDurationMs: 0,
  p50DurationMs: 0,
  p95DurationMs: 0,
  p99DurationMs: 0,
  maxDurationMs: 0,
  generatedAtUtc: new Date(0).toISOString()
};

const EMPTY_TOPOLOGY: TraceTopology = {
  nodes: [],
  edges: [],
  generatedAtUtc: new Date(0).toISOString()
};

const TRACEQUEST_TEXT: Record<string, Record<string, string>> = {
  en: {
    observability: 'Enterprise observability',
    title: 'TraceQuest',
    subtitle: 'Investigate Pet Lovers requests end-to-end across services, database calls and dependencies.',
    refresh: 'Refresh',
    refreshing: 'Refreshing',
    live: 'Live',
    connecting: 'Connecting',
    reconnecting: 'Reconnecting',
    disconnected: 'Offline',
    storeOnline: 'Trace store online',
    storeOffline: 'Trace store unavailable',
    backend: 'Backend',
    queryLatency: 'Query latency',
    service: 'Primary service',
    window: 'Time window',
    overview: 'Overview',
    traces: 'Traces',
    services: 'Services',
    topology: 'Topology',
    totalTraces: 'Total traces',
    errorRate: 'Error rate',
    p95Latency: 'P95 latency',
    averageLatency: 'Average latency',
    slowTraces: 'Slow traces',
    incomplete: 'Incomplete',
    p50: 'P50',
    p99: 'P99',
    max: 'Max',
    recentActivity: 'Recent activity',
    recentActivityHint: 'Latest requests matching the active time window.',
    hotOperations: 'Operation hotspots',
    hotOperationsHint: 'Operations sorted by errors and tail latency.',
    serviceHealth: 'Service performance',
    serviceHealthHint: 'Trace-level health aggregated per participating service.',
    serviceMap: 'Dependency map',
    serviceMapHint: 'Connections inferred from recent parent-child spans and dependency attributes.',
    viewAll: 'View all',
    noTraces: 'No traces match the current filters.',
    noAnalytics: 'No analytics are available for this time window.',
    noTopology: 'No dependency topology is available yet.',
    noServices: 'No service statistics are available yet.',
    operation: 'Operation',
    duration: 'Duration',
    spans: 'Spans',
    errors: 'Errors',
    status: 'Status',
    started: 'Started',
    traceId: 'Trace ID',
    search: 'Search',
    searchPlaceholder: 'Trace ID, operation, service',
    allServices: 'All services',
    allStatuses: 'All statuses',
    healthy: 'Healthy',
    slow: 'Slow',
    error: 'Error',
    operationPlaceholder: 'GET /api/pets',
    minDuration: 'Min duration',
    resultLimit: 'Result limit',
    applyFilters: 'Apply filters',
    clear: 'Clear',
    timeRange: 'Time range',
    custom: 'Custom',
    start: 'Start',
    end: 'End',
    liveUpdates: 'Live updates',
    autoRefresh: 'Auto refresh',
    selectTrace: 'Select a trace to inspect the complete span waterfall.',
    traceDetails: 'Trace details',
    copyId: 'Copy ID',
    copied: 'Trace ID copied',
    servicesInTrace: 'Services',
    spanWaterfall: 'Span waterfall',
    timeline: 'Timeline',
    spanInspector: 'Span inspector',
    kind: 'Kind',
    parent: 'Parent',
    root: 'root',
    attributes: 'Attributes',
    events: 'Events',
    noAttributes: 'No captured attributes for this span.',
    noEvents: 'No span events recorded.',
    totalSpans: 'Total spans',
    errorSpans: 'Error spans',
    traceErrors: 'Trace errors',
    avg: 'Avg',
    calls: 'calls',
    dependency: 'Dependency',
    generated: 'Generated',
    storeMessage: 'Jaeger is not reachable. Pet Lovers remains available, but trace analytics cannot be queried until the trace store is online.',
    rateLimited: 'TraceQuest is receiving too many requests. Wait a moment and refresh.',
    forbidden: 'This console is restricted to administrators.',
    genericError: 'TraceQuest data could not be loaded.',
    detailError: 'The selected trace could not be loaded.',
    invalidRange: 'The custom start time must be earlier than the end time.',
    lastUpdated: 'Last updated',
    never: 'Not yet',
    orphanSpans: 'Orphan spans',
    dataQuality: 'Data quality',
    realtimeDisabled: 'Realtime disabled',
    nodeService: 'Service',
    nodeDatabase: 'Database',
    nodeMessaging: 'Messaging',
    nodeExternal: 'External',
    details: 'Details'
  },
  fa: {
    observability: 'پایش سازمانی',
    title: 'TraceQuest',
    subtitle: 'رهگیری انتها‌به‌انتهای درخواست‌های Pet Lovers بین سرویس‌ها، دیتابیس و وابستگی‌های خارجی.',
    refresh: 'به‌روزرسانی',
    refreshing: 'در حال به‌روزرسانی',
    live: 'زنده',
    connecting: 'در حال اتصال',
    reconnecting: 'اتصال مجدد',
    disconnected: 'قطع',
    storeOnline: 'مخزن Trace در دسترس است',
    storeOffline: 'مخزن Trace در دسترس نیست',
    backend: 'زیرساخت',
    queryLatency: 'تاخیر Query',
    service: 'سرویس اصلی',
    window: 'بازه زمانی',
    overview: 'نمای کلی',
    traces: 'Traceها',
    services: 'سرویس‌ها',
    topology: 'توپولوژی',
    totalTraces: 'کل Traceها',
    errorRate: 'نرخ خطا',
    p95Latency: 'تاخیر P95',
    averageLatency: 'میانگین تاخیر',
    slowTraces: 'Traceهای کند',
    incomplete: 'ناقص',
    p50: 'P50',
    p99: 'P99',
    max: 'بیشینه',
    recentActivity: 'فعالیت‌های اخیر',
    recentActivityHint: 'آخرین درخواست‌های منطبق با بازه زمانی و فیلترهای فعال.',
    hotOperations: 'عملیات‌های مسئله‌دار',
    hotOperationsHint: 'مرتب‌شده بر اساس خطا و تاخیر انتهایی.',
    serviceHealth: 'عملکرد سرویس‌ها',
    serviceHealthHint: 'سلامت Traceها به تفکیک سرویس‌های درگیر.',
    serviceMap: 'نقشه وابستگی‌ها',
    serviceMapHint: 'ارتباطات استخراج‌شده از Spanهای اخیر و Attributeهای وابستگی.',
    viewAll: 'مشاهده همه',
    noTraces: 'Traceای با فیلترهای فعلی پیدا نشد.',
    noAnalytics: 'برای این بازه زمانی داده تحلیلی وجود ندارد.',
    noTopology: 'هنوز داده‌ای برای توپولوژی وابستگی‌ها وجود ندارد.',
    noServices: 'هنوز آمار سرویس‌ها موجود نیست.',
    operation: 'عملیات',
    duration: 'مدت',
    spans: 'Spanها',
    errors: 'خطاها',
    status: 'وضعیت',
    started: 'زمان شروع',
    traceId: 'شناسه Trace',
    search: 'جست‌وجو',
    searchPlaceholder: 'شناسه Trace، عملیات یا سرویس',
    allServices: 'همه سرویس‌ها',
    allStatuses: 'همه وضعیت‌ها',
    healthy: 'سالم',
    slow: 'کند',
    error: 'خطا',
    operationPlaceholder: 'GET /api/pets',
    minDuration: 'حداقل زمان',
    resultLimit: 'تعداد نتایج',
    applyFilters: 'اعمال فیلتر',
    clear: 'پاک کردن',
    timeRange: 'بازه زمانی',
    custom: 'دلخواه',
    start: 'شروع',
    end: 'پایان',
    liveUpdates: 'به‌روزرسانی زنده',
    autoRefresh: 'به‌روزرسانی خودکار',
    selectTrace: 'برای بررسی Waterfall کامل Spanها یک Trace را انتخاب کنید.',
    traceDetails: 'جزئیات Trace',
    copyId: 'کپی شناسه',
    copied: 'شناسه Trace کپی شد',
    servicesInTrace: 'سرویس‌ها',
    spanWaterfall: 'Waterfall اسپن‌ها',
    timeline: 'خط زمانی',
    spanInspector: 'بازرس Span',
    kind: 'نوع',
    parent: 'والد',
    root: 'ریشه',
    attributes: 'Attributeها',
    events: 'Eventها',
    noAttributes: 'برای این Span هیچ Attribute قابل نمایشی ثبت نشده است.',
    noEvents: 'برای این Span هیچ Eventای ثبت نشده است.',
    totalSpans: 'کل Spanها',
    errorSpans: 'Spanهای خطادار',
    traceErrors: 'Traceهای خطادار',
    avg: 'میانگین',
    calls: 'فراخوانی',
    dependency: 'وابستگی',
    generated: 'تولیدشده',
    storeMessage: 'Jaeger در دسترس نیست. Pet Lovers همچنان فعال است، اما تا زمان آنلاین شدن مخزن Trace امکان Query و تحلیل Traceها وجود ندارد.',
    rateLimited: 'تعداد درخواست‌ها به TraceQuest زیاد شده است. چند لحظه بعد دوباره تلاش کنید.',
    forbidden: 'این کنسول فقط برای مدیر سیستم در دسترس است.',
    genericError: 'داده‌های TraceQuest قابل دریافت نیستند.',
    detailError: 'جزئیات Trace انتخاب‌شده قابل دریافت نیست.',
    invalidRange: 'زمان شروع باید قبل از زمان پایان باشد.',
    lastUpdated: 'آخرین به‌روزرسانی',
    never: 'هنوز انجام نشده',
    orphanSpans: 'Spanهای یتیم',
    dataQuality: 'کیفیت داده',
    realtimeDisabled: 'Realtime غیرفعال',
    nodeService: 'سرویس',
    nodeDatabase: 'دیتابیس',
    nodeMessaging: 'پیام‌رسان',
    nodeExternal: 'خارجی',
    details: 'جزئیات'
  }
};

@Component({
  selector: 'app-tracequest-page',
  templateUrl: './tracequest-page.component.html',
  styleUrls: ['./tracequest-page.component.scss']
})
export class TraceQuestPageComponent implements OnInit, OnDestroy {
  activeTab: TraceQuestTab = 'overview';
  timePreset: TimePreset = '30m';
  filters: TraceFilters = { ...EMPTY_FILTERS };
  customStart = '';
  customEnd = '';

  traces: TraceSummary[] = [];
  services: string[] = [];
  operations: TraceOperationStat[] = [];
  serviceStats: TraceServiceStat[] = [];
  selectedTrace: TraceDetail | null = null;
  selectedSpan: TraceSpan | null = null;
  topology: TraceTopology = { ...EMPTY_TOPOLOGY };
  topologyPoints: TraceTopologyPoint[] = [];
  topologyConnections: TraceTopologyConnection[] = [];
  kpis: TraceKpis = { ...EMPTY_KPIS };
  health: TraceStoreHealth | null = null;
  configuration: TraceQuestClientConfiguration | null = null;

  loading = false;
  analyticsLoading = false;
  detailLoading = false;
  healthLoading = false;
  errorMessage = '';
  filterError = '';
  toastMessage = '';
  realtimeState: RealtimeState = 'disconnected';
  liveInsertCount = 0;
  autoRefresh = true;
  lastRefreshedAt: Date | null = null;

  readonly timePresets: Array<{ value: TimePreset; label: string }> = [
    { value: '15m', label: '15m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1h' },
    { value: '6h', label: '6h' },
    { value: '24h', label: '24h' },
    { value: 'custom', label: 'custom' }
  ];

  readonly limitOptions = [50, 100, 200, 500];

  private readonly subscriptions = new Subscription();
  private derivedRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly traceQuestApi: TraceQuestApiService,
    private readonly realtime: TraceQuestRealtimeService,
    readonly i18n: I18nService
  ) {}

  ngOnInit(): void {
    this.updateTimeWindow();
    this.loadConfiguration();
    this.loadServices();
    this.refresh();

    this.subscriptions.add(
      this.realtime.state$.subscribe(state => this.realtimeState = state)
    );
    this.subscriptions.add(
      this.realtime.traceCreated$.subscribe(trace => this.onTraceCreated(trace))
    );

    void this.realtime.connect();
    this.restartAutoRefresh();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.derivedRefreshTimer) clearTimeout(this.derivedRefreshTimer);
    if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    void this.realtime.disconnect();
  }

  t(key: string): string {
    const language = this.i18n.currentLanguage;
    const dictionary = TRACEQUEST_TEXT[language] || TRACEQUEST_TEXT['en'];
    const english = TRACEQUEST_TEXT['en'];
    return dictionary[key] || english[key] || key;
  }

  setTab(tab: TraceQuestTab): void {
    this.activeTab = tab;
  }

  setTimePreset(preset: TimePreset): void {
    this.timePreset = preset;
    this.filterError = '';
    if (preset === 'custom') {
      if (!this.customStart || !this.customEnd) {
        const now = new Date();
        const start = new Date(now.getTime() - 30 * 60 * 1000);
        this.customStart = this.toDateTimeLocal(start);
        this.customEnd = this.toDateTimeLocal(now);
      }
      return;
    }

    this.updateTimeWindow();
    this.applyFilters();
  }

  refresh(): void {
    if (!this.updateTimeWindow()) return;

    this.loading = true;
    this.errorMessage = '';
    this.traceQuestApi.getTraces(this.filters).subscribe({
      next: traces => {
        this.traces = traces;
        this.loading = false;
        this.lastRefreshedAt = new Date();
        this.reconcileSelectedTrace();
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage = this.errorText(error);
      }
    });

    this.refreshAnalytics();
    this.refreshHealth();
  }

  applyFilters(): void {
    if (!this.updateTimeWindow()) return;
    this.selectedTrace = null;
    this.selectedSpan = null;
    this.refresh();
  }

  clearFilters(): void {
    const limit = this.configuration?.defaultLimit || 100;
    this.filters = { ...EMPTY_FILTERS, limit };
    this.timePreset = '30m';
    this.customStart = '';
    this.customEnd = '';
    this.filterError = '';
    this.applyFilters();
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    this.restartAutoRefresh();
  }

  selectTrace(trace: TraceSummary): void {
    this.detailLoading = true;
    this.selectedSpan = null;
    this.traceQuestApi.getTrace(trace.traceId).subscribe({
      next: detail => {
        this.selectedTrace = detail;
        this.selectedSpan = detail.spans.length ? detail.spans[0] : null;
        this.detailLoading = false;
      },
      error: () => {
        this.errorMessage = this.t('detailError');
        this.detailLoading = false;
      }
    });
  }

  closeTraceDetail(): void {
    this.selectedTrace = null;
    this.selectedSpan = null;
  }

  selectSpan(span: TraceSpan): void {
    this.selectedSpan = span;
  }

  filterByService(serviceName: string): void {
    this.filters.serviceName = serviceName;
    this.activeTab = 'traces';
    this.applyFilters();
  }

  inspectTopologyNode(node: TraceTopologyNode): void {
    if (node.kind.toLowerCase() !== 'service') return;
    this.filterByService(node.name);
  }

  async copyTraceId(traceId: string): Promise<void> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(traceId);
      } else {
        this.fallbackCopy(traceId);
      }
      this.showToast(this.t('copied'));
    } catch {
      this.fallbackCopy(traceId);
      this.showToast(this.t('copied'));
    }
  }

  spanDepth(span: TraceSpan): number {
    if (!this.selectedTrace || !span.parentSpanId) return 0;
    const byId = new Map(this.selectedTrace.spans.map(item => [item.spanId, item]));
    let depth = 0;
    let parentId: string | null = span.parentSpanId;
    const seen = new Set<string>();

    while (parentId && depth < 10 && !seen.has(parentId)) {
      seen.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) break;
      depth++;
      parentId = parent.parentSpanId;
    }

    return depth;
  }

  waterfallLeft(span: TraceSpan): number {
    if (!this.selectedTrace?.durationMs) return 0;
    return this.clampPercent((span.startOffsetMs / this.selectedTrace.durationMs) * 100);
  }

  waterfallWidth(span: TraceSpan): number {
    if (!this.selectedTrace?.durationMs) return 1;
    return Math.min(100, Math.max(0.9, (span.durationMs / this.selectedTrace.durationMs) * 100));
  }

  attributeEntries(span: TraceSpan): Array<{ key: string; value: string }> {
    return Object.keys(span.attributes || {})
      .sort()
      .map(key => ({ key, value: span.attributes[key] }));
  }

  eventAttributeEntries(event: TraceSpanEvent): Array<{ key: string; value: string }> {
    return Object.keys(event.attributes || {})
      .sort()
      .map(key => ({ key, value: event.attributes[key] }));
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  healthClass(): string {
    if (!this.health) return 'is-unknown';
    return this.health.reachable ? 'is-online' : 'is-offline';
  }

  realtimeClass(): string {
    return `is-${this.realtimeState}`;
  }

  realtimeLabel(): string {
    if (this.configuration && !this.configuration.realtimeEnabled) return this.t('realtimeDisabled');
    if (this.realtimeState === 'connected') return this.t('live');
    if (this.realtimeState === 'connecting') return this.t('connecting');
    if (this.realtimeState === 'reconnecting') return this.t('reconnecting');
    return this.t('disconnected');
  }

  formatDuration(value: number): string {
    if (!Number.isFinite(value)) return '—';
    if (value >= 60000) return `${(value / 60000).toFixed(2)} min`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
    if (value >= 10) return `${value.toFixed(0)} ms`;
    return `${value.toFixed(2)} ms`;
  }

  formatPercent(value: number): string {
    return `${Number.isFinite(value) ? value.toFixed(value >= 10 ? 1 : 2) : '0'}%`;
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value || 0);
  }

  formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(this.locale(), {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  }

  formatFullTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(this.locale(), {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  lastUpdatedLabel(): string {
    if (!this.lastRefreshedAt) return this.t('never');
    return new Intl.DateTimeFormat(this.locale(), {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(this.lastRefreshedAt);
  }

  timeRangeLabel(): string {
    if (this.timePreset !== 'custom') {
      const preset = this.timePresets.find(item => item.value === this.timePreset);
      return preset?.label || '30m';
    }
    if (!this.filters.startTimeUtc || !this.filters.endTimeUtc) return this.t('custom');
    return `${this.formatTimestamp(this.filters.startTimeUtc)} – ${this.formatTimestamp(this.filters.endTimeUtc)}`;
  }

  errorRatio(errorCount: number, total: number): number {
    return total <= 0 ? 0 : this.clampPercent((errorCount / total) * 100);
  }

  slowRatio(slowCount: number, total: number): number {
    return total <= 0 ? 0 : this.clampPercent((slowCount / total) * 100);
  }

  edgeStrokeWidth(callCount: number): number {
    if (callCount <= 1) return 1.4;
    return Math.min(6, 1.4 + Math.log(callCount) * 1.15);
  }

  topologyNodeClass(kind: string): string {
    const normalized = kind.toLowerCase();
    if (normalized === 'database') return 'kind-database';
    if (normalized === 'messaging') return 'kind-messaging';
    if (normalized === 'external') return 'kind-external';
    return 'kind-service';
  }

  topologyKindLabel(kind: string): string {
    const normalized = kind.toLowerCase();
    if (normalized === 'database') return this.t('nodeDatabase');
    if (normalized === 'messaging') return this.t('nodeMessaging');
    if (normalized === 'external') return this.t('nodeExternal');
    return this.t('nodeService');
  }

  shortNodeName(name: string): string {
    if (name.length <= 19) return name;
    return `${name.slice(0, 17)}…`;
  }

  topOperations(limit = 6): TraceOperationStat[] {
    return this.operations.slice(0, limit);
  }

  topServices(limit = 6): TraceServiceStat[] {
    return this.serviceStats.slice(0, limit);
  }

  trackTrace(_: number, trace: TraceSummary): string {
    return trace.traceId;
  }

  trackSpan(_: number, span: TraceSpan): string {
    return span.spanId;
  }

  trackOperation(_: number, operation: TraceOperationStat): string {
    return `${operation.serviceName}:${operation.operation}`;
  }

  trackService(_: number, service: TraceServiceStat): string {
    return service.serviceName;
  }

  trackTopologyNode(_: number, point: TraceTopologyPoint): string {
    return point.node.id;
  }

  trackTopologyEdge(_: number, connection: TraceTopologyConnection): string {
    return `${connection.edge.source}:${connection.edge.target}`;
  }

  trackSpanEvent(index: number, event: TraceSpanEvent): string {
    return `${event.timestampUtc}:${event.name}:${index}`;
  }

  private loadConfiguration(): void {
    this.traceQuestApi.getConfiguration().subscribe({
      next: configuration => {
        this.configuration = configuration;
        if (this.filters.limit === EMPTY_FILTERS.limit) {
          this.filters.limit = Math.min(configuration.defaultLimit, configuration.maxSearchLimit);
        }
      }
    });
  }

  private loadServices(): void {
    this.traceQuestApi.getServices().subscribe({
      next: services => this.services = services.slice().sort((a, b) => a.localeCompare(b)),
      error: () => this.services = []
    });
  }

  private refreshAnalytics(): void {
    this.analyticsLoading = true;
    let completed = 0;
    const complete = (): void => {
      completed++;
      if (completed >= 4) this.analyticsLoading = false;
    };

    this.traceQuestApi.getKpis(this.filters).subscribe({
      next: kpis => this.kpis = kpis,
      error: () => { this.kpis = { ...EMPTY_KPIS }; complete(); },
      complete
    });

    this.traceQuestApi.getOperations(this.filters).subscribe({
      next: operations => this.operations = operations,
      error: () => { this.operations = []; complete(); },
      complete
    });

    this.traceQuestApi.getServiceStats(this.filters).subscribe({
      next: stats => this.serviceStats = stats,
      error: () => { this.serviceStats = []; complete(); },
      complete
    });

    const topologyLimit = Math.min(
      this.filters.limit,
      this.configuration?.topologyTraceLimit || 30
    );
    this.traceQuestApi.getTopology(this.filters, topologyLimit).subscribe({
      next: topology => {
        this.topology = topology;
        this.rebuildTopologyLayout();
      },
      error: () => {
        this.topology = { ...EMPTY_TOPOLOGY };
        this.rebuildTopologyLayout();
        complete();
      },
      complete
    });
  }

  private refreshHealth(): void {
    this.healthLoading = true;
    this.traceQuestApi.getHealthDetails().subscribe({
      next: health => {
        this.health = health;
        this.healthLoading = false;
      },
      error: () => {
        this.health = null;
        this.healthLoading = false;
      }
    });
  }

  private onTraceCreated(trace: TraceSummary): void {
    if (!this.matchesCurrentFilters(trace)) return;

    const existingIndex = this.traces.findIndex(item => item.traceId === trace.traceId);
    if (existingIndex >= 0) this.traces.splice(existingIndex, 1);
    this.traces = [trace, ...this.traces].slice(0, this.filters.limit);
    this.liveInsertCount++;
    this.lastRefreshedAt = new Date();

    if (this.derivedRefreshTimer) clearTimeout(this.derivedRefreshTimer);
    this.derivedRefreshTimer = setTimeout(() => {
      this.refreshAnalytics();
      this.refreshHealth();
    }, 900);
  }

  private matchesCurrentFilters(trace: TraceSummary): boolean {
    if (this.filters.serviceName && !trace.services.some(service => service === this.filters.serviceName)) return false;
    if (this.filters.status && trace.status !== this.filters.status) return false;
    if (this.filters.minDurationMs !== null && trace.durationMs < this.filters.minDurationMs) return false;

    if (this.filters.startTimeUtc && new Date(trace.startTimeUtc) < new Date(this.filters.startTimeUtc)) return false;
    if (this.filters.endTimeUtc && new Date(trace.startTimeUtc) > new Date(this.filters.endTimeUtc)) return false;

    const search = this.filters.search.trim().toLowerCase();
    if (search) {
      const haystack = [trace.traceId, trace.operation, trace.rootServiceName, ...trace.services]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    const operation = this.filters.operation.trim().toLowerCase();
    return !operation || trace.operation.toLowerCase().includes(operation);
  }

  private updateTimeWindow(): boolean {
    this.filterError = '';
    const now = new Date();
    let start: Date;
    let end = now;

    if (this.timePreset === 'custom') {
      if (!this.customStart || !this.customEnd) {
        this.filterError = this.t('invalidRange');
        return false;
      }
      start = new Date(this.customStart);
      end = new Date(this.customEnd);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
        this.filterError = this.t('invalidRange');
        return false;
      }
    } else {
      const minutes = this.presetMinutes(this.timePreset);
      start = new Date(now.getTime() - minutes * 60 * 1000);
    }

    this.filters.startTimeUtc = start.toISOString();
    this.filters.endTimeUtc = end.toISOString();
    return true;
  }

  private presetMinutes(preset: TimePreset): number {
    if (preset === '15m') return 15;
    if (preset === '1h') return 60;
    if (preset === '6h') return 360;
    if (preset === '24h') return 1440;
    return 30;
  }

  private restartAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
    if (!this.autoRefresh) return;

    this.autoRefreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible') this.refresh();
    }, 30000);
  }

  private reconcileSelectedTrace(): void {
    if (!this.selectedTrace) return;
    const stillVisible = this.traces.some(trace => trace.traceId === this.selectedTrace?.traceId);
    if (!stillVisible) this.closeTraceDetail();
  }

  private rebuildTopologyLayout(): void {
    const nodes = this.topology.nodes;
    if (!nodes.length) {
      this.topologyPoints = [];
      this.topologyConnections = [];
      return;
    }

    const centerX = 500;
    const centerY = 220;
    const radiusX = nodes.length <= 4 ? 250 : 360;
    const radiusY = nodes.length <= 4 ? 130 : 165;
    const points = nodes.map((node, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / nodes.length;
      return {
        node,
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY
      };
    });

    const byId = new Map(points.map(point => [point.node.id, point]));
    const byName = new Map(points.map(point => [point.node.name, point]));
    const connections: TraceTopologyConnection[] = [];

    for (const edge of this.topology.edges) {
      const source = byId.get(edge.source) || byName.get(edge.source);
      const target = byId.get(edge.target) || byName.get(edge.target);
      if (!source || !target) continue;
      connections.push({ edge, x1: source.x, y1: source.y, x2: target.x, y2: target.y });
    }

    this.topologyPoints = points;
    this.topologyConnections = connections;
  }

  private errorText(error: HttpErrorResponse): string {
    if (error.status === 403) return this.t('forbidden');
    if (error.status === 429) return this.t('rateLimited');
    if (error.status === 503) return this.t('storeMessage');
    return this.t('genericError');
  }

  private clampPercent(value: number): number {
    return Math.min(100, Math.max(0, value));
  }

  private locale(): string {
    if (this.i18n.currentLanguage === 'fa') return 'fa-IR';
    if (this.i18n.currentLanguage === 'fr') return 'fr-FR';
    if (this.i18n.currentLanguage === 'es') return 'es-ES';
    return 'en-AU';
  }

  private toDateTimeLocal(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage = '', 2200);
  }

  private fallbackCopy(value: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
