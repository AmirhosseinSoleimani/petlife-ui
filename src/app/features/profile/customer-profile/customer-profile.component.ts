import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { apiErrorMessage } from '../../../core/api/api-error.util';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { IdentityProfile, UpdateIdentityProfileRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-customer-profile',
  templateUrl: './customer-profile.component.html',
  styleUrls: ['./customer-profile.component.scss']
})
export class CustomerProfileComponent implements OnInit {
  readonly contactOptions = ['Email', 'Mobile', 'InApp'];

  profile: IdentityProfile | null = null;
  form: UpdateIdentityProfileRequest = { firstName: '', lastName: '' };
  isLoading = false;
  isSaving = false;
  isClosing = false;
  showCloseForm = false;
  closePassword = '';
  closeAcknowledged = false;
  loadError = '';
  saveError = '';
  saveSuccess = '';
  closeError = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  get profileInitials(): string {
    if (!this.profile) return '?';
    return (this.profile.firstName.trim().charAt(0) + this.profile.lastName.trim().charAt(0)).toUpperCase() || '?';
  }

  get canSaveNames(): boolean {
    if (!this.profile || this.isSaving) return false;
    const firstName = this.form.firstName.trim();
    const lastName = this.form.lastName.trim();
    return firstName.length > 0 && firstName.length <= 100 &&
      lastName.length > 0 && lastName.length <= 100 &&
      (firstName !== this.profile.firstName || lastName !== this.profile.lastName);
  }

  get canCloseAccount(): boolean {
    return (this.profile?.role || '').toLowerCase() === 'customer';
  }

  loadProfile(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.loadError = '';
    this.profile = null;
    // Users is the identity authority. /api/customer/profile belongs to an obsolete contract.
    this.apiService.get<ApiResponse<IdentityProfile>>('/v1/identity/profile').subscribe({
      next: (response) => {
        this.isLoading = false;
        if (!response.success || !response.data?.id) {
          this.loadError = 'profile.loadError';
          return;
        }
        this.profile = response.data;
        this.form = { firstName: response.data.firstName, lastName: response.data.lastName };
      },
      error: (error) => {
        this.isLoading = false;
        this.loadError = apiErrorMessage(error, 'profile.loadError');
      }
    });
  }

  save(): void {
    if (!this.canSaveNames) return;
    const payload: UpdateIdentityProfileRequest = {
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim()
    };
    this.isSaving = true;
    this.saveError = '';
    this.saveSuccess = '';
    // The current Users update contract accepts only firstName and lastName.
    this.apiService.put<ApiResponse<IdentityProfile>>('/v1/identity/profile', payload).subscribe({
      next: (response) => {
        this.isSaving = false;
        if (!response.success || !response.data?.id) {
          this.saveError = 'profile.saveError';
          return;
        }
        this.profile = response.data;
        this.form = { firstName: response.data.firstName, lastName: response.data.lastName };
        this.authService.syncProfile(response.data);
        this.saveSuccess = 'profile.saveSuccess';
      },
      error: (error) => {
        this.isSaving = false;
        this.saveError = apiErrorMessage(error, 'profile.saveError');
      }
    });
  }

  toggleCloseForm(): void {
    if (!this.canCloseAccount || this.isClosing) return;
    this.showCloseForm = !this.showCloseForm;
    this.closePassword = '';
    this.closeAcknowledged = false;
    this.closeError = '';
  }

  closeAccount(): void {
    if (!this.canCloseAccount || !this.showCloseForm || this.isClosing ||
        !this.closeAcknowledged || !this.closePassword.trim()) return;

    this.isClosing = true;
    this.closeError = '';
    // Account closure is password-gated and revokes sessions. It is not cross-service data erasure.
    this.apiService.post<void>('/v1/identity/account/close', {
      currentPassword: this.closePassword
    }).subscribe({
      next: () => {
        this.closePassword = '';
        this.isClosing = false;
        this.authService.signOutLocally();
      },
      error: (error) => {
        this.closePassword = '';
        this.isClosing = false;
        this.closeError = apiErrorMessage(error, 'profile.closeError');
      }
    });
  }
}
