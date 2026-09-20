export type TraceStatus = 'Healthy' | 'Slow' | 'Error';

export interface TraceServiceSummary {
  serviceName: string;
  spanCount: number;
  errorSpanCount: number;
}

export interface TraceSummary {
  traceId: string;
  operation: string;
  rootServiceName: string;
  durationMs: number;
  status: TraceStatus;
  startTimeUtc: string;
  spanCount: number;
  errorSpanCount: number;
  services: string[];
  orphanSpanCount: number;
  serviceSummaries: TraceServiceSummary[] | null;
}

export interface TraceSpanEvent {
  name: string;
  timestampUtc: string;
  attributes: Record<string, string>;
}

export interface TraceSpan {
  spanId: string;
  parentSpanId: string | null;
  name: string;
  serviceName: string;
  kind: string;
  startTimeUtc: string;
  startOffsetMs: number;
  durationMs: number;
  status: TraceStatus;
  attributes: Record<string, string>;
  events: TraceSpanEvent[];
}

export interface TraceDetail {
  traceId: string;
  operation: string;
  rootServiceName: string;
  durationMs: number;
  status: TraceStatus;
  startTimeUtc: string;
  services: string[];
  spans: TraceSpan[];
}

export interface TraceTopologyNode {
  id: string;
  name: string;
  kind: string;
  spanCount: number;
  errorCount: number;
}

export interface TraceTopologyEdge {
  source: string;
  target: string;
  callCount: number;
  errorCount: number;
  averageDurationMs: number;
}

export interface TraceTopology {
  nodes: TraceTopologyNode[];
  edges: TraceTopologyEdge[];
  generatedAtUtc: string;
}

export interface TraceKpis {
  totalTraces: number;
  incompleteTraces: number;
  healthyTraces: number;
  slowTraces: number;
  errorTraces: number;
  errorRatePercent: number;
  averageDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  maxDurationMs: number;
  generatedAtUtc: string;
}

export interface TraceOperationStat {
  serviceName: string;
  operation: string;
  totalTraces: number;
  errorTraces: number;
  slowTraces: number;
  errorRatePercent: number;
  averageDurationMs: number;
  p95DurationMs: number;
  maxDurationMs: number;
}

export interface TraceServiceStat {
  serviceName: string;
  totalTraces: number;
  totalSpans: number;
  errorTraces: number;
  errorSpans: number;
  slowTraces: number;
  errorRatePercent: number;
  averageDurationMs: number;
  p95DurationMs: number;
}

export interface TraceStoreHealth {
  backend: string;
  status: string;
  reachable: boolean;
  latencyMs: number;
  checkedAtUtc: string;
  message: string | null;
}

export interface TraceQuestClientConfiguration {
  defaultServiceName: string;
  recentWindowMinutes: number;
  maxQueryWindowMinutes: number;
  slowThresholdMs: number;
  defaultLimit: number;
  maxSearchLimit: number;
  topologyTraceLimit: number;
  realtimeEnabled: boolean;
}

export interface TraceFilters {
  serviceName: string;
  operation: string;
  status: '' | TraceStatus;
  search: string;
  minDurationMs: number | null;
  startTimeUtc: string | null;
  endTimeUtc: string | null;
  limit: number;
}

export interface TraceTopologyPoint {
  node: TraceTopologyNode;
  x: number;
  y: number;
}

export interface TraceTopologyConnection {
  edge: TraceTopologyEdge;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
