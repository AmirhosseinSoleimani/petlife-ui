import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ProviderDocument, ProviderVerification } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-admin-provider-verification',
  templateUrl: './admin-provider-verification.component.html',
  styleUrls: ['./admin-provider-verification.component.scss']
})
export class AdminProviderVerificationComponent implements OnInit {
  documents: ProviderDocument[] = [];
  selected: ProviderVerification | null = null;
  statusFilter = 'Pending';
  reviewStatus = 'Approved';
  reviewReason = '';
  verificationStatus = 'UnderReview';
  verificationReason = '';
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  readonly reviewStatuses = ['Approved', 'NeedsCorrection', 'Rejected', 'Suspended'];
  readonly verificationStatuses = ['Pending', 'UnderReview', 'Approved', 'NeedsCorrection', 'Rejected', 'Suspended'];

  constructor(private readonly api: ApiService) {}
  ngOnInit(): void { this.loadQueue(); }

  loadQueue(): void {
    this.isLoading = true; this.errorMessage = '';
    const query = this.statusFilter ? `?status=${encodeURIComponent(this.statusFilter)}` : '';
    this.api.get<ApiResponse<ProviderDocument[]>>(`/admin/provider-verification/documents${query}`).subscribe({
      next: response => { this.documents = response.data || []; this.isLoading = false; },
      error: () => { this.errorMessage = 'Unable to load the verification queue.'; this.isLoading = false; }
    });
  }

  openProvider(document: ProviderDocument): void {
    this.errorMessage = '';
    // The current Providers host exposes document queue/review and profile status writes,
    // but no GET provider-verification detail endpoint. Use the selected queue item.
    this.selected = { providerUserId: document.providerUserId, providerProfileId: '', businessName: document.providerUserId, verificationStatus: 'Pending', documents: this.documents.filter(item => item.providerUserId === document.providerUserId), badges: [] };
    this.verificationStatus = this.selected.verificationStatus;
    this.reviewReason = '';
    this.verificationReason = '';
    /* this.api.get<ApiResponse<ProviderVerification>>(`/admin/provider-verification/providers/${document.providerUserId}`).subscribe({
      next: response => {
        this.selected = response.data || null;
        this.verificationStatus = this.selected?.verificationStatus || 'UnderReview';
        this.reviewReason = '';
        this.verificationReason = '';
      },
      error: () => this.errorMessage = 'Unable to load provider verification details.'
    }); */
  }

  review(document: ProviderDocument): void {
    if (this.requiresReason(this.reviewStatus) && !this.reviewReason.trim()) { this.errorMessage = 'A review reason is required for this status.'; return; }
    this.isSaving = true; this.errorMessage = ''; this.successMessage = '';
    this.api.put<ApiResponse<ProviderDocument>>(`/admin/provider-verification/documents/${document.id}/review`, { decision: this.reviewStatus, reason: this.reviewReason.trim() || null }).subscribe({
      next: () => { this.successMessage = 'Document review saved.'; this.reviewReason = ''; this.refreshSelected(document.providerUserId); this.loadQueue(); },
      error: err => { this.errorMessage = this.apiMessage(err, 'Unable to save the document review.'); this.isSaving = false; },
      complete: () => this.isSaving = false
    });
  }

  updateVerification(): void {
    if (!this.selected) return;
    if (this.requiresReason(this.verificationStatus) && !this.verificationReason.trim()) { this.errorMessage = 'A reason is required for this verification status.'; return; }
    this.isSaving = true; this.errorMessage = ''; this.successMessage = '';
    this.api.put<ApiResponse<ProviderVerification>>(`/admin/provider-verification/profiles/${this.selected.providerUserId}/status`, { decision: this.verificationStatus, reason: this.verificationReason.trim() || null }).subscribe({
      next: response => { this.selected = response.data || this.selected; this.successMessage = 'Provider verification status updated.'; this.verificationReason = ''; },
      error: err => { this.errorMessage = this.apiMessage(err, 'Unable to update provider verification.'); this.isSaving = false; },
      complete: () => this.isSaving = false
    });
  }

  download(document: ProviderDocument): void {
    this.api.download(`/admin/provider-verification/documents/${document.id}/download`).subscribe({
      next: blob => { const url = URL.createObjectURL(blob); const a = window.document.createElement('a'); a.href = url; a.download = document.originalFileName || 'provider-document'; a.click(); URL.revokeObjectURL(url); },
      error: () => this.errorMessage = 'Unable to download the private document.'
    });
  }

  requiresReason(status: string): boolean { return ['NeedsCorrection', 'Rejected', 'Suspended'].includes(status); }
  statusTone(status: string): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
    if (status === 'Approved') return 'success';
    if (status === 'Pending' || status === 'UnderReview') return 'warning';
    if (status === 'NeedsCorrection') return 'info';
    if (['Rejected', 'Expired', 'Suspended'].includes(status)) return 'danger';
    return 'neutral';
  }

  private refreshSelected(providerUserId: string): void {
    if (this.selected?.providerUserId === providerUserId) {
      this.selected = { ...this.selected, documents: this.documents.filter(item => item.providerUserId === providerUserId) };
    }
  }
  private apiMessage(error: any, fallback: string): string { return error?.error?.errors?.join(' ') || error?.error?.message || fallback; }
}
