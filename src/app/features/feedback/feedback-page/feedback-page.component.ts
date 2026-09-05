import { Component } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { FeedbackReport } from '../../../core/models/marketplace.models';

@Component({ selector: 'app-feedback-page', templateUrl: './feedback-page.component.html', styleUrls: ['./feedback-page.component.scss'] })
export class FeedbackPageComponent {
  category = 'General'; priority = 'Normal'; subject = ''; description = ''; isSaving = false; errorMessage = ''; successMessage = '';
  readonly priorities = ['Low','Normal','High','Critical'];
  constructor(private readonly api: ApiService) {}
  submit(): void {
    if (!this.subject.trim() || !this.description.trim() || !this.category.trim()) { this.errorMessage = 'Category, subject and description are required.'; return; }
    this.isSaving = true; this.errorMessage = ''; this.successMessage = '';
    this.api.post<ApiResponse<FeedbackReport>>('/feedback', { category: this.category.trim(), priority: this.priority, subject: this.subject.trim(), description: this.description.trim() }).subscribe({
      next: () => { this.successMessage = 'Thanks. Your report is now in the admin operations queue.'; this.subject = ''; this.description = ''; },
      error: err => { this.errorMessage = err?.error?.errors?.join(' ') || err?.error?.message || 'Unable to submit feedback.'; this.isSaving = false; },
      complete: () => this.isSaving = false
    });
  }
}
