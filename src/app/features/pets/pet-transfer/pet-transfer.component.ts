import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { apiErrorMessage } from '../../../core/api/api-error.util';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet } from '../../../core/models/customer-core.models';
import {
  PetTransferPreview,
  PetTransferResult,
  PetTransferToken,
  PetTransferTokenSummary
} from '../../../core/models/marketplace.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

@Component({
  selector: 'app-pet-transfer',
  templateUrl: './pet-transfer.component.html',
  styleUrls: ['./pet-transfer.component.scss']
})
export class PetTransferComponent implements OnInit {
  pets: Pet[] = [];
  tokens: PetTransferTokenSummary[] = [];
  selectedPetId: string | null = null;
  transferCode = '';
  expiryMinutes = 30;
  createdToken: PetTransferToken | null = null;
  preview: PetTransferPreview | null = null;
  result: PetTransferResult | null = null;
  isLoading = false;
  isCreating = false;
  isPreviewing = false;
  isTransferring = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  get petOptions(): AppInputOption[] {
    return this.pets.map((pet) => ({ label: `${pet.petName} — ${pet.species}`, value: pet.id }));
  }

  get isExpiryValid(): boolean {
    const value = Number(this.expiryMinutes);
    return Number.isFinite(value) && value >= 5 && value <= 1440;
  }

  get canTransfer(): boolean {
    return !!this.selectedPetId && !!this.preview && !!this.transferCode.trim() && !this.isTransferring;
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    let pending = 2;
    const done = () => { pending -= 1; if (!pending) this.isLoading = false; };

    this.api.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: (response) => { this.pets = response.data || []; done(); },
      error: (error) => { this.errorMessage = apiErrorMessage(error, 'petTransfer.loadError'); done(); }
    });
    this.api.get<ApiResponse<PetTransferTokenSummary[]>>('/pet-transfers/tokens').subscribe({
      next: (response) => { this.tokens = response.data || []; done(); },
      error: (error) => { this.errorMessage = apiErrorMessage(error, 'petTransfer.loadError'); done(); }
    });
  }

  createToken(): void {
    if (!this.isExpiryValid) {
      this.errorMessage = 'petTransfer.expiryInvalid';
      return;
    }
    this.isCreating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.createdToken = null;
    this.api.post<ApiResponse<PetTransferToken>>('/pet-transfers/tokens', { expiresInMinutes: Number(this.expiryMinutes) }).subscribe({
      next: (response) => {
        this.createdToken = response.data;
        this.successMessage = 'petTransfer.codeCreated';
        this.reloadTokens();
      },
      error: (error) => { this.errorMessage = apiErrorMessage(error, 'petTransfer.createError'); this.isCreating = false; },
      complete: () => this.isCreating = false
    });
  }

  revokeToken(token: PetTransferTokenSummary): void {
    this.errorMessage = '';
    this.api.post<ApiResponse<unknown>>(`/pet-transfers/tokens/${token.id}/revoke`, {}).subscribe({
      next: () => {
        this.successMessage = 'petTransfer.codeRevoked';
        this.reloadTokens();
      },
      error: (error) => this.errorMessage = apiErrorMessage(error, 'petTransfer.revokeError')
    });
  }

  onCodeChanged(value: string | number | boolean | null): void {
    this.transferCode = typeof value === 'string' ? value : '';
    this.preview = null;
    this.result = null;
    this.errorMessage = '';
  }

  previewRecipient(): void {
    if (!this.transferCode.trim()) return;
    this.isPreviewing = true;
    this.preview = null;
    this.result = null;
    this.errorMessage = '';
    this.api.post<ApiResponse<PetTransferPreview>>('/pet-transfers/preview', { transferCode: this.transferCode.trim() }).subscribe({
      next: (response) => this.preview = response.data,
      error: (error) => { this.errorMessage = apiErrorMessage(error, 'petTransfer.previewError'); this.isPreviewing = false; },
      complete: () => this.isPreviewing = false
    });
  }

  transferPet(): void {
    if (!this.canTransfer || !this.selectedPetId) return;
    this.isTransferring = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.post<ApiResponse<PetTransferResult>>(`/pets/${this.selectedPetId}/transfer`, { transferCode: this.transferCode.trim() }).subscribe({
      next: (response) => {
        this.result = response.data;
        this.successMessage = 'petTransfer.transferSuccess';
        this.preview = null;
        this.transferCode = '';
        this.selectedPetId = null;
        window.dispatchEvent(new CustomEvent('petlife:notifications-changed'));
        this.load();
      },
      error: (error) => { this.errorMessage = apiErrorMessage(error, 'petTransfer.transferError'); this.isTransferring = false; },
      complete: () => this.isTransferring = false
    });
  }

  copyCode(): void {
    if (!this.createdToken?.transferCode) return;
    navigator.clipboard?.writeText(this.createdToken.transferCode).catch(() => undefined);
  }

  tokenStatusKey(token: PetTransferTokenSummary): string {
    if (token.isUsed) return 'petTransfer.used';
    if (token.isRevoked) return 'petTransfer.revoked';
    if (token.isExpired) return 'petTransfer.expired';
    return 'petTransfer.active';
  }

  private reloadTokens(): void {
    this.api.get<ApiResponse<PetTransferTokenSummary[]>>('/pet-transfers/tokens').subscribe({
      next: (response) => this.tokens = response.data || []
    });
  }
}
