import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Provider, ProviderProfilePayload } from '../../../core/models/marketplace.models';

const emptyProfileForm: ProviderProfilePayload = {
  businessName: '',
  contactName: '',
  phoneNumber: '',
  email: '',
  websiteUrl: '',
  businessDescription: '',
  addressLine1: '',
  suburb: '',
  state: '',
  postcode: '',
  country: 'Australia',
  isActive: true
};

@Component({
  selector: 'app-provider-profile',
  templateUrl: './provider-profile.component.html',
  styleUrls: ['./provider-profile.component.scss']
})
export class ProviderProfileComponent implements OnInit {
  profile: Provider | null = null;
  form: ProviderProfilePayload = { ...emptyProfileForm };
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  get hasProfile(): boolean {
    return !!this.profile?.id;
  }

  get statusLabel(): string {
    return this.profile?.verificationStatus || (this.profile?.isActive === false ? 'Inactive' : 'Active');
  }

  get statusTone(): 'success' | 'warning' | 'neutral' {
    if (this.profile?.isActive === false) {
      return 'neutral';
    }

    return this.profile?.verificationStatus?.toLowerCase() === 'verified' ? 'success' : 'warning';
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<Provider>>('/providers/me').subscribe({
      next: (response) => {
        this.profile = response.data || null;
        this.form = this.profile ? this.toForm(this.profile) : { ...emptyProfileForm };
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.profile = null;
        this.form = { ...emptyProfileForm };
        if (error.status !== 404) {
          this.errorMessage = 'Unable to load provider profile.';
        }
        this.isLoading = false;
      }
    });
  }

  saveProfile(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const isEditing = this.hasProfile;

    const request = isEditing
      ? this.apiService.put<ApiResponse<Provider>>('/providers/me', this.form)
      : this.apiService.post<ApiResponse<Provider>>('/providers/me', this.form);

    request.subscribe({
      next: (response) => {
        this.profile = response.data;
        this.form = this.toForm(response.data);
        this.successMessage = isEditing ? 'Provider profile saved.' : 'Provider profile created.';
      },
      error: () => {
        this.errorMessage = 'Unable to save provider profile.';
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  private toForm(profile: Provider): ProviderProfilePayload {
    return {
      businessName: profile.businessName || '',
      contactName: profile.contactName || '',
      phoneNumber: profile.phoneNumber || profile.phone || '',
      email: profile.email || '',
      websiteUrl: profile.websiteUrl || profile.website || '',
      businessDescription: profile.businessDescription || profile.description || '',
      addressLine1: profile.addressLine1 || '',
      addressLine2: profile.addressLine2 || '',
      suburb: profile.suburb || '',
      state: profile.state || '',
      postcode: profile.postcode || '',
      country: profile.country || 'Australia',
      isActive: profile.isActive !== false
    };
  }
}
