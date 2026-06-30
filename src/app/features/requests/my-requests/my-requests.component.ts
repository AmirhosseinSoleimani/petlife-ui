import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ServiceRequest } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-my-requests',
  templateUrl: './my-requests.component.html',
  styleUrls: ['./my-requests.component.scss']
})
export class MyRequestsComponent implements OnInit {
  requests: ServiceRequest[] = [];
  selectedRequest: ServiceRequest | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  getPetName(request: ServiceRequest): string {
    return request.pet?.petName || request.pet?.name || request.petName || 'Pet';
  }

  getServiceName(request: ServiceRequest): string {
    return request.providerService?.name || request.providerService?.serviceName || request.serviceName || 'Service';
  }

  getProviderName(request: ServiceRequest): string {
    return request.provider?.businessName || request.provider?.name || request.providerService?.provider?.businessName || request.providerName || 'Provider';
  }

  getStatus(request: ServiceRequest): string {
    return request.status || 'Requested';
  }

  getStatusTone(request: ServiceRequest): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
    switch (this.getStatus(request).toLowerCase()) {
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'completed':
        return 'info';
      case 'requested':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  loadRequests(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<ServiceRequest[]>>('/service-requests/my').subscribe({
      next: (response) => {
        this.requests = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load service requests.';
        this.isLoading = false;
      }
    });
  }

  selectRequest(request: ServiceRequest): void {
    this.apiService.get<ApiResponse<ServiceRequest>>(`/service-requests/${request.id}`).subscribe({
      next: (response) => {
        this.selectedRequest = response.data || request;
      },
      error: () => {
        this.selectedRequest = request;
      }
    });
  }
}
