import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { apiErrorMessage } from '../../../core/api/api-error.util';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet } from '../../../core/models/customer-core.models';
import { PetTransferToken, PetTransferTokenSummary } from '../../../core/models/marketplace.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';
import { AppDialogService } from '../../../shared/services/app-dialog.service';

/** New numeric codes are 8 digits; previously issued 64-hex codes remain valid. */
export function validTransferCode(value: string): boolean {
  const code = value.trim();
  return /^[0-9]{8}$/.test(code) || /^[a-f0-9]{64}$/i.test(code);
}

function isGuid(value: string): boolean {
  return /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
}

@Component({
  selector: 'app-pet-transfer',
  templateUrl: './pet-transfer.component.html',
  styleUrls: ['./pet-transfer.component.scss']
})
export class PetTransferComponent implements OnInit {
  pets: Pet[] = [];
  selectedPetId: string | null = null;
  transferCode = '';
  expiryMinutes = 30;

  // Only the ID is retained in sessionStorage, scoped to the signed-in user.
  // The secret transferCode is NEVER persisted; it is shown once on creation.
  lastTokenId: string | null = null;
  createdToken: PetTransferToken | null = null;
  tokenSummary: PetTransferTokenSummary | null = null;
  isLoadingToken = false;
  isRevoking = false;
  tokenError = '';

  transferCompleted = false;
  completedPetName = '';
  isLoading = false;
  isCreating = false;
  isConfirming = false;
  isTransferring = false;
  errorMessage = '';
  successMessage = '';

  private tokenReadVersion = 0;

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly dialogs: AppDialogService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get petOptions(): AppInputOption[] {
    return this.pets.map(pet => ({ label: `${pet.petName} — ${pet.species}`, value: pet.id }));
  }

  get isExpiryValid(): boolean {
    const minutes = Number(this.expiryMinutes);
    return Number.isInteger(minutes) && minutes >= 5 && minutes <= 60;
  }

  get isCodeValid(): boolean {
    return validTransferCode(this.transferCode);
  }

  get canTransfer(): boolean {
    return !!this.selectedPetId && this.isCodeValid && !this.isConfirming && !this.isTransferring;
  }

  get canRevokeToken(): boolean {
    return !!this.lastTokenId && !this.isRevoking && !this.isCreating &&
      !this.tokenSummary?.isUsed && !this.tokenSummary?.isExpired && !this.tokenSummary?.isRevoked;
  }

  load(): void {
    this.errorMessage = '';
    this.loadPets();
    this.lastTokenId = this.readLastTokenId();
    if (this.lastTokenId) this.refreshToken();
  }

  private loadPets(): void {
    this.isLoading = true;
    this.api.get<ApiResponse<Pet[]>>('/v1/pets').subscribe({
      next: response => {
        this.pets = response?.success && Array.isArray(response.data) ? response.data : [];
        if (!response?.success) this.errorMessage = 'petTransfer.loadError';
        this.isLoading = false;
      },
      error: error => {
        this.isLoading = false;
        this.errorMessage = this.requestError(error, 'petTransfer.loadError');
      }
    });
  }

  createToken(): void {
    if (this.isCreating) return;
    if (!this.isExpiryValid) {
      this.errorMessage = 'petTransfer.expiryInvalid';
      return;
    }
    this.isCreating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.tokenError = '';
    this.createdToken = null;

    this.api.post<ApiResponse<PetTransferToken>>('/v1/pet-transfer-tokens', {
      expiresInMinutes: Number(this.expiryMinutes)
    }).subscribe({
      next: response => {
        this.isCreating = false;
        const token = response?.data;
        if (!response?.success || !token?.id || !isGuid(token.id) ||
            !token?.expiresAt || !validTransferCode(token.transferCode || '')) {
          this.errorMessage = response?.message || 'petTransfer.createError';
          return;
        }
        this.createdToken = token;
        this.lastTokenId = token.id;
        this.tokenSummary = null;
        this.storeLastTokenId(token.id);
        this.successMessage = 'petTransfer.codeCreated';
        this.refreshToken();
      },
      error: error => {
        this.isCreating = false;
        this.errorMessage = this.requestError(error, 'petTransfer.createError');
      }
    });
  }

  refreshToken(): void {
    const id = this.lastTokenId;
    if (!id || !isGuid(id)) return;

    // Discard responses from an older token when another code is created.
    const version = ++this.tokenReadVersion;
    this.isLoadingToken = true;
    this.tokenError = '';

    this.api.get<ApiResponse<PetTransferTokenSummary>>(`/v1/pet-transfer-tokens/${id}`).subscribe({
      next: response => {
        if (version !== this.tokenReadVersion || this.lastTokenId !== id) return;
        this.isLoadingToken = false;
        if (!response?.success || response.data?.id !== id) {
          this.tokenError = response?.message || 'petTransfer.statusError';
          return;
        }
        this.tokenSummary = response.data;
      },
      error: error => {
        if (version !== this.tokenReadVersion || this.lastTokenId !== id) return;
        this.isLoadingToken = false;
        this.tokenError = this.requestError(error, 'petTransfer.statusError');
      }
    });
  }

  revokeToken(): void {
    const id = this.lastTokenId;
    if (!id || !this.canRevokeToken) return;

    this.isRevoking = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.post<ApiResponse<unknown>>(`/v1/pet-transfer-tokens/${id}/revoke`, {}).subscribe({
      next: response => {
        this.isRevoking = false;
        if (!response?.success) {
          this.errorMessage = response?.message || 'petTransfer.revokeError';
          return;
        }
        this.createdToken = null;
        if (this.tokenSummary) this.tokenSummary = { ...this.tokenSummary, isRevoked: true };
        this.successMessage = 'petTransfer.codeRevoked';
        this.refreshToken();
      },
      error: error => {
        this.isRevoking = false;
        this.errorMessage = this.requestError(error, 'petTransfer.revokeError');
      }
    });
  }

  onCodeChanged(value: string | number | boolean | null): void {
    this.transferCode = typeof value === 'string'
      ? value.replace(/[\s-]/g, '').slice(0, 64)
      : '';
    this.transferCompleted = false;
    this.completedPetName = '';
    this.errorMessage = '';
  }

  async transferPet(): Promise<void> {
    if (!this.canTransfer || !this.selectedPetId) return;
    const petId = this.selectedPetId;
    const code = this.transferCode.trim();
    const petName = this.pets.find(pet => pet.id === petId)?.petName || '';

    // Users must confirm the irreversible transfer. The Pets service does NOT
    // expose a recipient-preview API, so never display a fabricated recipient.
    this.isConfirming = true;
    let accepted = false;
    try {
      accepted = await this.dialogs.confirm({
        title: 'petTransfer.confirmDialogTitle',
        message: 'petTransfer.confirmDialogText',
        confirmLabel: 'petTransfer.confirmTransfer',
        cancelLabel: 'common.cancel',
        tone: 'danger'
      });
    } finally {
      this.isConfirming = false;
    }
    if (!accepted || this.selectedPetId !== petId || this.transferCode.trim() !== code ||
        this.isTransferring) return;

    this.isTransferring = true;
    this.errorMessage = '';
    this.successMessage = '';
    // This endpoint returns {success:true, data:null}; it does not return a preview or transfer DTO.
    this.api.post<ApiResponse<unknown>>(`/v1/pets/${petId}/transfer`, { transferCode: code }).subscribe({
      next: response => {
        this.isTransferring = false;
        if (!response?.success) {
          this.errorMessage = response?.message || 'petTransfer.transferError';
          return;
        }
        this.transferCompleted = true;
        this.completedPetName = petName;
        this.successMessage = 'petTransfer.transferSuccess';
        this.transferCode = '';
        this.selectedPetId = null;
        window.dispatchEvent(new CustomEvent('petlife:notifications-changed'));
        this.loadPets();
      },
      error: error => {
        this.isTransferring = false;
        this.errorMessage = this.requestError(error, 'petTransfer.transferError');
      }
    });
  }

  async copyCode(): Promise<void> {
    const code = this.createdToken?.transferCode;
    if (!code) return;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(code);
        this.successMessage = 'petTransfer.codeCopied';
        return;
      } catch { /* HTTP LAN origins may not allow the Clipboard API. */ }
    }
    // Same trusted user-click fallback used by Pet Sharing on the HTTP LAN.
    const input = document.createElement('textarea');
    input.value = code;
    input.readOnly = true;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* Clipboard refused. */ }
    document.body.removeChild(input);
    if (copied) this.successMessage = 'petTransfer.codeCopied';
    else this.errorMessage = 'petTransfer.copyFailed';
  }

  tokenStatusKey(token: PetTransferTokenSummary): string {
    if (token.isUsed) return 'petTransfer.used';
    if (token.isRevoked) return 'petTransfer.revoked';
    if (token.isExpired) return 'petTransfer.expired';
    return 'petTransfer.active';
  }

  private requestError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 503) return 'petTransfer.serviceUnavailable';
      if (error.status === 404) {
        // Invalid/redeemed codes also produce 404, with a structured Pets error.
        // Show that precise error instead of blaming Gateway routing.
        const detailed = apiErrorMessage(error, '');
        return detailed || 'petTransfer.endpointUnavailable';
      }
    }
    return apiErrorMessage(error, fallback);
  }

  private storageKey(): string | null {
    const userId = this.auth.getCurrentUser()?.id;
    return userId && isGuid(userId) ? `petlife.transfer.latest.${userId.toLowerCase()}` : null;
  }

  private readLastTokenId(): string | null {
    const key = this.storageKey();
    if (!key) return null;
    try {
      const stored = sessionStorage.getItem(key);
      return stored && isGuid(stored) ? stored : null;
    } catch { return null; }
  }

  private storeLastTokenId(id: string): void {
    const key = this.storageKey();
    if (!key || !isGuid(id)) return;
    try { sessionStorage.setItem(key, id); } catch { /* Browser storage may be blocked. */ }
  }
}
