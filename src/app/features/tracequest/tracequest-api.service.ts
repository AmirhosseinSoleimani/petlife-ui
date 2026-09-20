import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/api/api.service';
import {
  TraceDetail,
  TraceFilters,
  TraceKpis,
  TraceOperationStat,
  TraceQuestClientConfiguration,
  TraceServiceStat,
  TraceStoreHealth,
  TraceSummary,
  TraceTopology
} from './tracequest.models';

@Injectable({ providedIn: 'root' })
export class TraceQuestApiService {
  constructor(private readonly api: ApiService) {}

  getTraces(filters: TraceFilters): Observable<TraceSummary[]> {
    return this.api.get<TraceSummary[]>(`/tracequest/traces${this.buildQuery(filters)}`);
  }

  getTrace(traceId: string): Observable<TraceDetail> {
    return this.api.get<TraceDetail>(`/tracequest/traces/${encodeURIComponent(traceId)}`);
  }

  getServices(): Observable<string[]> {
    return this.api.get<string[]>('/tracequest/services');
  }

  getKpis(filters: TraceFilters): Observable<TraceKpis> {
    return this.api.get<TraceKpis>(`/tracequest/kpis${this.buildQuery(filters)}`);
  }

  getOperations(filters: TraceFilters): Observable<TraceOperationStat[]> {
    return this.api.get<TraceOperationStat[]>(`/tracequest/operations${this.buildQuery(filters)}`);
  }

  getServiceStats(filters: TraceFilters): Observable<TraceServiceStat[]> {
    return this.api.get<TraceServiceStat[]>(`/tracequest/service-stats${this.buildQuery(filters)}`);
  }

  getTopology(filters: TraceFilters, limit = 30): Observable<TraceTopology> {
    return this.api.get<TraceTopology>(`/tracequest/topology${this.buildQuery(filters, limit)}`);
  }

  getHealthDetails(): Observable<TraceStoreHealth> {
    return this.api.get<TraceStoreHealth>('/tracequest/health/details');
  }

  getConfiguration(): Observable<TraceQuestClientConfiguration> {
    return this.api.get<TraceQuestClientConfiguration>('/tracequest/config');
  }

  private buildQuery(filters: TraceFilters, limitOverride?: number): string {
    const params = new URLSearchParams();
    const serviceName = filters.serviceName.trim();
    const operation = filters.operation.trim();
    const search = filters.search.trim();

    if (serviceName) params.set('serviceName', serviceName);
    if (operation) params.set('operation', operation);
    if (filters.status) params.set('status', filters.status);
    if (search) params.set('search', search);
    if (filters.minDurationMs !== null && filters.minDurationMs >= 0) {
      params.set('minDurationMs', String(filters.minDurationMs));
    }
    if (filters.startTimeUtc) params.set('startTimeUtc', filters.startTimeUtc);
    if (filters.endTimeUtc) params.set('endTimeUtc', filters.endTimeUtc);

    params.set('limit', String(limitOverride === undefined ? filters.limit : limitOverride));
    return `?${params.toString()}`;
  }
}
