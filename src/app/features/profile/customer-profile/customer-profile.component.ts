import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { CustomerProfile, CustomerProfilePayload } from '../../../core/models/customer-core.models';

const emptyPayload: CustomerProfilePayload = {
  address: '',
  country: 'Australia',
  state: '',
  city: '',
  suburb: '',
  postcode: '',
  preferredContactMethod: '',
  notificationByEmail: true,
  notificationInApp: true,
  marketingConsent: false
};

@Component({
  selector: 'app-customer-profile',
  templateUrl: './customer-profile.component.html',
  styleUrls: ['./customer-profile.component.scss']
})
export class CustomerProfileComponent implements OnInit {
  readonly contactOptions = ['Email', 'Mobile', 'InApp'];
  profile: CustomerProfile | null = null;
  form: CustomerProfilePayload = { ...emptyPayload };
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.apiService.get<ApiResponse<CustomerProfile>>('/customer/profile').subscribe({
      next: (response) => {
        this.profile = response.data;
        this.form = {
          address: response.data.address || '', country: response.data.country || 'Australia',
          state: response.data.state || '', city: response.data.city || '', suburb: response.data.suburb || '',
          postcode: response.data.postcode || '', preferredContactMethod: response.data.preferredContactMethod || '',
          notificationByEmail: response.data.notificationByEmail, notificationInApp: response.data.notificationInApp,
          marketingConsent: response.data.marketingConsent
        };
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load customer profile.';
        this.isLoading = false;
      }
    });
  }

  save(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.put<ApiResponse<CustomerProfile>>('/customer/profile', this.form).subscribe({
      next: (response) => {
        this.profile = response.data;
        this.successMessage = 'Profile saved successfully.';
        this.isSaving = false;
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'Unable to save customer profile.';
        this.isSaving = false;
      }
    });
  }
}
