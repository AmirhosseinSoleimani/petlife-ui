import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ProviderDocument, ProviderVerification } from '../../../core/models/marketplace.models';

interface ProviderDocumentWire {
  id: string;
  providerProfileId: string;
  type: string;
  status: string;
  expiryDate?: string | null;
}

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
    this.api.get<ProviderDocumentWire[]>(`/admin/provider-verification/documents${query}`).subscribe({
      next: response => { this.documents = Array.isArray(response) ? response.map(doc => ({ id: doc.id, providerUserId: doc.providerProfileId, documentType: doc.type, status: doc.status, expiryDate: doc.expiryDate, originalFileName: doc.type, sizeBytes: 0, createdAt: '' })) : []; if (this.selected) this.refreshSelected(this.selected.providerUserId); this.isLoading = false; },
      error: () => { this.errorMessage = 'Unable to load the verification queue.'; this.isLoading = false; }
    });
  }

  openProvider(document: ProviderDocument): void {
    this.errorMessage = '';
    // The current Providers host exposes document queue/review and profile status writes,
    // but no GET provider-verification detail endpoint. Use the selected queue item.
    this.selected = { providerUserId: document.providerUserId, providerProfileId: document.providerUserId, businessName: document.providerUserId, verificationStatus: 'Pending', documents: this.documents.filter(item => item.providerUserId === document.providerUserId), badges: [] };
    this.verificationStatus = this.selected.verificationStatus;
    this.reviewReason = '';
    this.verificationReason = '';

  }

  review(document: ProviderDocument): void {
    if (this.requiresReason(this.reviewStatus) && !this.reviewReason.trim()) { this.errorMessage = 'A review reason is required for this status.'; return; }
    this.isSaving = true; this.errorMessage = ''; this.successMessage = '';
    this.api.put<void>(`/admin/provider-verification/documents/${document.id}/review`, { decision: this.reviewStatus, reason: this.reviewReason.trim() || null }).subscribe({
      next: () => { this.successMessage = 'Document review saved.'; this.reviewReason = ''; this.loadQueue(); },
      error: err => { this.errorMessage = this.apiMessage(err, 'Unable to save the document review.'); this.isSaving = false; },
      complete: () => this.isSaving = false
    });
  }

  updateVerification(): void {
    if (!this.selected) return;
    if (this.requiresReason(this.verificationStatus) && !this.verificationReason.trim()) { this.errorMessage = 'A reason is required for this verification status.'; return; }
    this.isSaving = true; this.errorMessage = ''; this.successMessage = '';
    this.api.put<void>(`/admin/provider-verification/profiles/${this.selected.providerProfileId}/status`, { decision: this.verificationStatus, reason: this.verificationReason.trim() || null }).subscribe({
      next: () => { if (this.selected) this.selected.verificationStatus = this.verificationStatus; this.successMessage = 'Provider verification status updated.'; this.verificationReason = ''; },
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
