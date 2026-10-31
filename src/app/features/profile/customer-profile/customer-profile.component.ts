import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { apiErrorMessage } from '../../../core/api/api-error.util';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  IdentityAddressForm,
  IdentityProfile,
  UpdateIdentityAddressRequest,
  UpdateIdentityProfileRequest
} from '../../../core/models/auth.models';

const ADDRESS_FIELDS: Array<keyof IdentityAddressForm> = [
  'address', 'suburb', 'postcode', 'city', 'state', 'country'
];

function emptyAddress(): IdentityAddressForm {
  return { address: '', suburb: '', postcode: '', city: '', state: '', country: '' };
}

function addressFromProfile(profile: IdentityProfile): IdentityAddressForm {
  return {
    address: profile.address ?? '',
    suburb: profile.suburb ?? '',
    postcode: profile.postcode ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    country: profile.country ?? ''
  };
}

/** Do not permit address writes while an older Users contract is deployed. */
function hasAddressContract(profile: IdentityProfile): boolean {
  return ADDRESS_FIELDS.every(field => Object.prototype.hasOwnProperty.call(profile, field));
}

@Component({
  selector: 'app-customer-profile',
  templateUrl: './customer-profile.component.html',
  styleUrls: ['./customer-profile.component.scss']
})
export class CustomerProfileComponent implements OnInit {
  readonly contactOptions = ['Email', 'Mobile', 'InApp'];

  profile: IdentityProfile | null = null;
  form: UpdateIdentityProfileRequest = { firstName: '', lastName: '' };
  addressForm: IdentityAddressForm = emptyAddress();
  private savedAddress: IdentityAddressForm = emptyAddress();
  addressSupported = false;
  isSavingAddress = false;
  addressError = '';
  addressSuccess = '';
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

  get hasAddressChanges(): boolean {
    return ADDRESS_FIELDS.some(field =>
      this.addressForm[field].trim() !== this.savedAddress[field].trim());
  }

  get canSaveAddress(): boolean {
    return !!this.profile && this.addressSupported && !this.isLoading &&
      !this.isSavingAddress && this.hasAddressChanges;
  }

  onAddressEdited(): void {
    this.addressError = '';
    this.addressSuccess = '';
  }

  revertAddress(): void {
    if (!this.addressSupported || this.isSavingAddress) return;
    this.addressForm = { ...this.savedAddress };
    this.onAddressEdited();
  }

  get canCloseAccount(): boolean {
    return (this.profile?.role || '').toLowerCase() === 'customer';
  }

  loadProfile(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.loadError = '';
    this.profile = null;
    this.addressSupported = false;
    this.addressError = '';
    this.addressSuccess = '';
    this.addressForm = emptyAddress();
    this.savedAddress = emptyAddress();
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
        // Allow entering details even while the backend is being upgraded.
        // A missing address contract is reported only if saving fails.
        this.addressSupported = true;
        this.addressForm = addressFromProfile(response.data);
        this.savedAddress = { ...this.addressForm };
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
        // Name updates may return a legacy response without the address extension.
        this.profile = { ...this.profile!, ...response.data };
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

  saveAddress(): void {
    if (!this.canSaveAddress) return;

    // Submit the entire optional form. Null clears a field; no user ID is client supplied.
    const payload: UpdateIdentityAddressRequest = {
      address: this.addressForm.address.trim() || null,
      suburb: this.addressForm.suburb.trim() || null,
      postcode: this.addressForm.postcode.trim() || null,
      city: this.addressForm.city.trim() || null,
      state: this.addressForm.state.trim() || null,
      country: this.addressForm.country.trim() || null
    };

    this.isSavingAddress = true;
    this.addressError = '';
    this.addressSuccess = '';
    // The proposed contract does not fix the response body shape. Handle 200 or 204.
    this.apiService.put<ApiResponse<IdentityProfile> | null>(
      '/v1/identity/profile/address', payload
    ).subscribe({
      next: response => {
        this.isSavingAddress = false;
        if (!response || response.success !== true || !response.data ||
            !hasAddressContract(response.data)) {
          this.addressError = 'profile.addressSaveError';
          return;
        }
        const saved: IdentityAddressForm = addressFromProfile(response.data);
        this.savedAddress = { ...saved };
        this.addressForm = { ...saved };
        this.profile = { ...this.profile!, ...response.data };
        this.addressSuccess = 'profile.addressSaveSuccess';
      },
      error: error => {
        this.isSavingAddress = false;
        this.addressError = apiErrorMessage(error, 'profile.addressSaveError');
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
