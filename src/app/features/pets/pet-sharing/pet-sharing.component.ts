import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { CreatePetSharePayload, PET_SHARE_SCOPES, PetShareAudit, PetShareGrant, ScopedPetShare } from '../../../core/models/phase1-care.models';
import { AppDialogService } from '../../../shared/services/app-dialog.service';

export type ShareMode = 'public' | 'private';
export type ShareDetailsMode = 'preview' | 'audit' | null;

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Calendar constraints mirror the Pets domain (future only, at most 90 days). */
export function shareExpiryWindow(now: Date = new Date()): { min: string; max: string } {
  const min = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const max = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 89);
  return { min: localDateValue(min), max: localDateValue(max) };
}

export function isValidRecipientContact(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length <= 254 && (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ||
    /^\+?[0-9][0-9 ()-]{6,19}$/.test(trimmed)
  );
}

@Component({
  selector: 'app-pet-sharing',
  templateUrl: './pet-sharing.component.html',
  styleUrls: ['./pet-sharing.component.scss']
})
export class PetSharingComponent implements OnInit {
  readonly availableScopes = PET_SHARE_SCOPES;
  activeTab: ShareMode = 'public';
  petId = '';
  grants: PetShareGrant[] = [];
  form: CreatePetSharePayload = this.emptyForm();
  recipientContact = '';
  selectedScopes = new Set<string>(['PetProfile']);
  generatedLink = '';
  isLoading = false;
  isSaving = false;
  revokingShareId: string | null = null;
  errorMessage = '';
  successMessage = '';

  detailsMode: ShareDetailsMode = null;
  detailsLoading = false;
  detailsError = '';
  preview: ScopedPetShare | null = null;
  audit: PetShareAudit[] = [];

  constructor(
    private readonly apiService: ApiService,
    private readonly route: ActivatedRoute,
    private readonly dialogService: AppDialogService
  ) {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
  }

  ngOnInit(): void { this.load(); }

  get expiryWindow(): { min: string; max: string } { return shareExpiryWindow(); }
  get filteredGrants(): PetShareGrant[] {
    return this.grants.filter(grant => this.activeTab === 'private'
      ? !!grant.recipientUserId : !grant.recipientUserId);
  }

  get detailsTitle(): string {
    return this.detailsMode === 'audit' ? 'sharing.auditTitle' : 'sharing.previewTitle';
  }

  selectTab(mode: ShareMode): void {
    if (this.activeTab === mode) return;
    this.activeTab = mode;
    this.errorMessage = '';
    this.successMessage = '';
    this.generatedLink = '';
    this.form = this.emptyForm();
    this.recipientContact = '';
    this.selectedScopes = new Set<string>(['PetProfile']);
    this.closeDetails();
  }

  load(): void {
    this.isLoading = true;
    this.apiService.get<ApiResponse<PetShareGrant[]>>(`/v1/pets/${this.petId}/shares`).subscribe({
      next: response => {
        this.grants = response?.success && Array.isArray(response.data) ? response.data : [];
        this.isLoading = false;
        if (!response?.success) this.errorMessage = 'sharing.loadError';
      },
      error: () => { this.errorMessage = 'sharing.loadError'; this.isLoading = false; }
    });
  }

  toggleScope(scope: string, checked: boolean): void {
    checked ? this.selectedScopes.add(scope) : this.selectedScopes.delete(scope);
  }

  hasScope(scope: string): boolean { return this.selectedScopes.has(scope); }

  createShare(): void {
    if (this.isSaving) return;
    this.errorMessage = '';
    this.successMessage = '';
    this.generatedLink = '';
    if (!this.selectedScopes.size) { this.errorMessage = 'sharing.scopeRequired'; return; }

    const { min, max } = this.expiryWindow;
    if (!this.form.expiresAt || this.form.expiresAt < min || this.form.expiresAt > max) {
      this.errorMessage = 'sharing.expiryInvalid';
      return;
    }

    const expires = new Date(`${this.form.expiresAt}T23:59:59`);
    if (Number.isNaN(expires.getTime()) || expires <= new Date()) {
      this.errorMessage = 'sharing.expiryInvalid';
      return;
    }

    const contact = this.recipientContact.trim();
    if (this.activeTab === 'private' && !isValidRecipientContact(contact)) {
      this.errorMessage = 'sharing.recipientContactInvalid';
      return;
    }

    // The backend has no approved contact-to-provider resolver yet. Never allow
    // an unknown field to be ignored and accidentally create a public bearer link.
    if (this.activeTab === 'private') {
      this.errorMessage = 'sharing.privateUnavailable';
      return;
    }

    this.isSaving = true;
    const payload: CreatePetSharePayload = {
      scopes: Array.from(this.selectedScopes),
      expiresAt: expires.toISOString(),
      recipientUserId: null,
      // Private sharing fails closed above until Users resolves and verifies recipients.
      recipientContact: null,
      recipientLabel: this.form.recipientLabel?.trim() || null,
      purpose: this.form.purpose?.trim() || null
    };
    this.apiService.post<ApiResponse<PetShareGrant>>(`/v1/pets/${this.petId}/shares`, payload).subscribe({
      next: response => {
        this.isSaving = false;
        const grant = response?.data;
        if (!response?.success || !grant?.id || (this.activeTab === 'public' && !grant.accessToken)) {
          this.errorMessage = 'sharing.createError';
          this.load();
          return;
        }
        this.generatedLink = this.activeTab === 'private'
          ? `${window.location.origin}/shared/provider/${grant.id}`
          : `${window.location.origin}/shared/pet/${grant.accessToken}`;
        this.form = this.emptyForm();
        this.recipientContact = '';
        this.selectedScopes = new Set<string>(['PetProfile']);
        this.successMessage = this.activeTab === 'private' ? 'sharing.privateCreated' : 'sharing.created';
        this.load();
      },
      error: () => { this.errorMessage = 'sharing.createError'; this.isSaving = false; }
    });
  }

  showPreview(grant: PetShareGrant): void {
    this.closeDetails();
    this.detailsMode = 'preview';
    this.detailsLoading = true;
    this.apiService.get<ApiResponse<ScopedPetShare>>(`/v1/pet-shares/${grant.id}/preview`).subscribe({
      next: response => {
        this.preview = response?.success ? response.data : null;
        this.detailsError = this.preview ? '' : 'sharing.previewError';
        this.detailsLoading = false;
      },
      error: () => { this.detailsError = 'sharing.previewError'; this.detailsLoading = false; }
    });
  }

  showAudit(grant: PetShareGrant): void {
    this.closeDetails();
    this.detailsMode = 'audit';
    this.detailsLoading = true;
    this.apiService.get<ApiResponse<PetShareAudit[]>>(`/v1/pet-shares/${grant.id}/audit`).subscribe({
      next: response => {
        this.audit = response?.success && Array.isArray(response.data) ? response.data : [];
        this.detailsError = response?.success ? '' : 'sharing.auditError';
        this.detailsLoading = false;
      },
      error: () => { this.detailsError = 'sharing.auditError'; this.detailsLoading = false; }
    });
  }

  closeDetails(): void {
    this.detailsMode = null;
    this.detailsLoading = false;
    this.detailsError = '';
    this.preview = null;
    this.audit = [];
  }

  async revoke(grant: PetShareGrant): Promise<void> {
    if (!grant.isActive || this.revokingShareId) return;
    const confirmed = await this.dialogService.confirm({
      title: 'sharing.revokeConfirmTitle',
      message: 'sharing.revokeConfirm',
      confirmLabel: 'sharing.revoke',
      cancelLabel: 'common.cancel',
      tone: 'danger'
    });
    if (!confirmed) return;
    this.revokingShareId = grant.id;
    this.errorMessage = '';
    this.apiService.post<ApiResponse<unknown>>(`/v1/pet-shares/${grant.id}/revoke`, {}).subscribe({
      next: response => {
        this.revokingShareId = null;
        if (!response?.success) { this.errorMessage = 'sharing.revokeError'; return; }
        this.successMessage = 'sharing.revoked';
        this.closeDetails();
        this.load();
      },
      error: () => { this.revokingShareId = null; this.errorMessage = 'sharing.revokeError'; }
    });
  }

  async copyGeneratedLink(): Promise<void> {
    if (!this.generatedLink) return;
    // HTTP LAN deployments do not expose the secure-context Clipboard API.
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(this.generatedLink);
        this.successMessage = 'sharing.linkCopied';
        return;
      } catch { /* Fall back to a user-initiated DOM copy. */ }
    }
    const input = document.createElement('textarea');
    input.value = this.generatedLink;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(input);
    this.successMessage = copied ? 'sharing.linkCopied' : '';
    if (!copied) this.errorMessage = 'sharing.copyFailed';
  }

  async shareGeneratedLink(): Promise<void> {
    if (!this.generatedLink) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Pet sharing', url: this.generatedLink });
        return;
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return;
      }
    }
    await this.copyGeneratedLink();
  }

  private emptyForm(): CreatePetSharePayload {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return { scopes: [], expiresAt: localDateValue(date), recipientUserId: null,
      recipientContact: null, recipientLabel: '', purpose: '' };
  }
}
