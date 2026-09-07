import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ProviderDocument } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-provider-documents',
  templateUrl: './provider-documents.component.html',
  styleUrls: ['./provider-documents.component.scss']
})
export class ProviderDocumentsComponent implements OnInit {
  documents: ProviderDocument[] = [];
  documentType = 'Insurance';
  expiryDate = '';
  providerNote = '';
  selectedFile: File | null = null;
  renewingDocument: ProviderDocument | null = null;
  isLoading = false;
  isSaving = false;
  message = '';
  errorMessage = '';
  readonly documentTypes = ['Insurance', 'BusinessRegistration', 'Qualification', 'Identity', 'Other'];

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.api.get<ApiResponse<ProviderDocument[]>>('/provider-documents/me').subscribe({
      next: response => { this.documents = response.data || []; this.isLoading = false; },
      error: () => { this.errorMessage = 'Unable to load provider documents.'; this.isLoading = false; }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files && input.files.length ? input.files[0] : null;
  }

  beginRenew(document: ProviderDocument): void {
    this.renewingDocument = document;
    this.documentType = document.documentType;
    this.expiryDate = document.expiryDate || '';
    this.providerNote = document.providerNote || '';
    this.selectedFile = null;
    this.message = '';
    this.errorMessage = '';
  }

  cancelRenew(): void {
    this.renewingDocument = null;
    this.resetForm();
  }

  submit(): void {
    if (!this.selectedFile) { this.errorMessage = 'Select a PDF or image before submitting.'; return; }
    if (this.documentType === 'Insurance' && !this.expiryDate) { this.errorMessage = 'Insurance documents require an expiry date.'; return; }
    const form = new FormData();
    form.append('file', this.selectedFile, this.selectedFile.name);
    if (this.expiryDate) form.append('expiryDate', this.expiryDate);
    if (this.providerNote.trim()) form.append('providerNote', this.providerNote.trim());
    const endpoint = this.renewingDocument ? `/provider-documents/${this.renewingDocument.id}/renew` : '/provider-documents';
    if (!this.renewingDocument) form.append('documentType', this.documentType);
    this.isSaving = true;
    this.errorMessage = '';
    this.message = '';
    this.api.postForm<ApiResponse<ProviderDocument>>(endpoint, form).subscribe({
      next: () => {
        this.message = this.renewingDocument ? 'Document renewed and returned to pending review.' : 'Document uploaded for review.';
        this.renewingDocument = null;
        this.resetForm();
        this.load();
      },
      error: err => { this.errorMessage = this.apiMessage(err, 'Unable to save the document.'); this.isSaving = false; },
      complete: () => this.isSaving = false
    });
  }

  remove(document: ProviderDocument): void {
    if (document.status === 'Approved' || !window.confirm(`Delete ${document.originalFileName}?`)) return;
    this.api.delete<ApiResponse<unknown>>(`/provider-documents/${document.id}`).subscribe({
      next: () => { this.message = 'Document deleted.'; this.load(); },
      error: err => this.errorMessage = this.apiMessage(err, 'Unable to delete the document.')
    });
  }

  download(document: ProviderDocument): void {
    this.api.download(`/provider-documents/${document.id}/download`).subscribe({
      next: blob => this.saveBlob(blob, document.originalFileName),
      error: () => this.errorMessage = 'Unable to download the document.'
    });
  }

  statusTone(status: string): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
    switch ((status || '').toLowerCase()) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': case 'expired': case 'suspended': return 'danger';
      case 'needscorrection': return 'info';
      default: return 'neutral';
    }
  }

  private resetForm(): void {
    this.documentType = 'Insurance';
    this.expiryDate = '';
    this.providerNote = '';
    this.selectedFile = null;
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = fileName || 'provider-document'; anchor.click();
    URL.revokeObjectURL(url);
  }

  private apiMessage(error: any, fallback: string): string {
    return error?.error?.errors?.join(' ') || error?.error?.message || fallback;
  }
}
