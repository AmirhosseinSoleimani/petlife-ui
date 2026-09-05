import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { CreatePetSharePayload, PET_SHARE_SCOPES, PetShareAudit, PetShareGrant, ScopedPetShare } from '../../../core/models/phase1-care.models';

@Component({
  selector: 'app-pet-sharing',
  templateUrl: './pet-sharing.component.html',
  styleUrls: ['./pet-sharing.component.scss']
})
export class PetSharingComponent implements OnInit {
  readonly availableScopes = PET_SHARE_SCOPES;
  petId = this.route.snapshot.paramMap.get('petId') || '';
  grants: PetShareGrant[] = [];
  preview: ScopedPetShare | null = null;
  audit: PetShareAudit[] = [];
  auditShareId: string | null = null;
  form: CreatePetSharePayload = this.emptyForm();
  selectedScopes = new Set<string>(['PetProfile', 'VitalSummary']);
  generatedLink = '';
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService, private readonly route: ActivatedRoute, private readonly i18nService: I18nService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.apiService.get<ApiResponse<PetShareGrant[]>>(`/pets/${this.petId}/shares`).subscribe({
      next: (response) => { this.grants = response.data || []; this.isLoading = false; },
      error: () => { this.errorMessage = 'sharing.loadError'; this.isLoading = false; }
    });
  }

  toggleScope(scope: string, checked: boolean): void {
    checked ? this.selectedScopes.add(scope) : this.selectedScopes.delete(scope);
  }

  hasScope(scope: string): boolean { return this.selectedScopes.has(scope); }

  createShare(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.generatedLink = '';
    if (!this.selectedScopes.size) { this.errorMessage = 'sharing.scopeRequired'; return; }
    const expires = new Date(`${this.form.expiresAt}T23:59:59`);
    if (!this.form.expiresAt || Number.isNaN(expires.getTime()) || expires <= new Date()) {
      this.errorMessage = 'sharing.expiryInvalid';
      return;
    }

    this.isSaving = true;
    const payload: CreatePetSharePayload = {
      ...this.form,
      scopes: Array.from(this.selectedScopes),
      expiresAt: expires.toISOString(),
      recipientUserId: this.form.recipientUserId || null,
      recipientLabel: this.form.recipientLabel?.trim() || null,
      purpose: this.form.purpose?.trim() || null
    };
    this.apiService.post<ApiResponse<PetShareGrant>>(`/pets/${this.petId}/shares`, payload).subscribe({
      next: (response) => {
        const token = response.data?.accessToken;
        if (token) this.generatedLink = `${window.location.origin}/shared/pet/${token}`;
        this.form = this.emptyForm();
        this.selectedScopes = new Set<string>(['PetProfile', 'VitalSummary']);
        this.successMessage = 'sharing.created';
        this.isSaving = false;
        this.load();
      },
      error: () => { this.errorMessage = 'sharing.createError'; this.isSaving = false; }
    });
  }

  showPreview(grant: PetShareGrant): void {
    this.preview = null;
    this.apiService.get<ApiResponse<ScopedPetShare>>(`/pet-shares/${grant.id}/preview`).subscribe({
      next: (response) => this.preview = response.data,
      error: () => this.errorMessage = 'sharing.previewError'
    });
  }

  showAudit(grant: PetShareGrant): void {
    this.audit = [];
    this.auditShareId = grant.id;
    this.apiService.get<ApiResponse<PetShareAudit[]>>(`/pet-shares/${grant.id}/audit`).subscribe({
      next: response => this.audit = response.data || [],
      error: () => this.errorMessage = 'sharing.auditError'
    });
  }

  revoke(grant: PetShareGrant): void {
    if (!grant.isActive || !window.confirm(this.i18nService.translate('sharing.revokeConfirm'))) return;
    this.apiService.post<ApiResponse<unknown>>(`/pet-shares/${grant.id}/revoke`, {}).subscribe({
      next: () => { this.successMessage = 'sharing.revoked'; this.preview = null; this.load(); },
      error: () => this.errorMessage = 'sharing.revokeError'
    });
  }

  copyGeneratedLink(): void {
    if (!this.generatedLink) return;
    navigator.clipboard?.writeText(this.generatedLink).then(() => this.successMessage = 'sharing.linkCopied');
  }

  private emptyForm(): CreatePetSharePayload {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return { scopes: [], expiresAt: this.toLocalDateInputValue(date), recipientUserId: null, recipientLabel: '', purpose: '' };
  }

  private toLocalDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
