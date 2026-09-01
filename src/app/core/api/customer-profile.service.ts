import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { CustomerProfile, UpdateCustomerProfileRequest } from '../models/customer-profile.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CustomerProfileService {
  constructor(private readonly apiService: ApiService) {}

  getMine(): Observable<CustomerProfile> {
    return this.apiService.get<ApiResponse<CustomerProfile>>('/customer-profile/me').pipe(
      map((response) => this.requireProfile(response))
    );
  }

  updateMine(request: UpdateCustomerProfileRequest): Observable<CustomerProfile> {
    return this.apiService.put<ApiResponse<CustomerProfile>>('/customer-profile/me', request).pipe(
      map((response) => this.requireProfile(response))
    );
  }

  private requireProfile(response: ApiResponse<CustomerProfile>): CustomerProfile {
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Customer profile response did not contain profile data.');
    }

    return response.data;
  }
}
