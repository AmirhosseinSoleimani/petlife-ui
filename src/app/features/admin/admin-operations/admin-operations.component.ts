import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AdminKpi, AdminRequestOversight, FeedbackReport, ServiceRequest } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-admin-operations',
  templateUrl: './admin-operations.component.html',
  styleUrls: ['./admin-operations.component.scss']
})
export class AdminOperationsComponent implements OnInit {
  kpi: AdminKpi | null = null;
  requests: ServiceRequest[] = [];
  requestTotal = 0;
  feedback: FeedbackReport[] = [];
  requestStatus = '';
  feedbackStatus = '';
  feedbackPriority = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly api: ApiService) {}
  ngOnInit(): void { this.loadAll(); }

  loadAll(): void { this.loadKpi(); this.loadRequests(); this.loadFeedback(); }
  loadKpi(): void {
    this.api.get<ApiResponse<AdminKpi>>('/admin/kpi').subscribe({ next: r => this.kpi = r.data || null, error: () => this.errorMessage = 'Unable to load admin KPI data.' });
  }
  loadRequests(): void {
    this.isLoading = true;
    const query = this.requestStatus ? `?status=${encodeURIComponent(this.requestStatus)}` : '';
    this.api.get<ApiResponse<AdminRequestOversight>>(`/admin/request-oversight${query}`).subscribe({
      next: r => { this.requests = r.data?.items || []; this.requestTotal = r.data?.totalCount || this.requests.length; this.isLoading = false; },
      error: () => { this.errorMessage = 'Unable to load request oversight.'; this.isLoading = false; }
    });
  }
  loadFeedback(): void {
    const params = new URLSearchParams(); if (this.feedbackStatus) params.set('status', this.feedbackStatus); if (this.feedbackPriority) params.set('priority', this.feedbackPriority);
    const query = params.toString() ? `?${params.toString()}` : '';
    this.api.get<ApiResponse<FeedbackReport[]>>(`/admin/feedback${query}`).subscribe({ next: r => this.feedback = r.data || [], error: () => this.errorMessage = 'Unable to load feedback queue.' });
  }
  saveFeedback(item: FeedbackReport): void {
    this.errorMessage = ''; this.successMessage = '';
    this.api.put<ApiResponse<FeedbackReport>>(`/admin/feedback/${item.id}`, { status: item.status, priority: item.priority, adminNotes: item.adminNotes || null }).subscribe({
      next: r => { Object.assign(item, r.data || {}); this.successMessage = 'Feedback workflow updated.'; this.loadKpi(); },
      error: err => this.errorMessage = err?.error?.errors?.join(' ') || err?.error?.message || 'Unable to update feedback.'
    });
  }
  statusTone(status: string): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
    const value = (status || '').toLowerCase(); if (['completed','resolved','closed','accepted'].includes(value)) return 'success'; if (['rejected','suspended'].includes(value)) return 'danger'; if (['requested','open','needmoreinfo'].includes(value)) return 'warning'; if (['viewed','available','contacted','inprogress'].includes(value)) return 'info'; return 'neutral';
  }
}
