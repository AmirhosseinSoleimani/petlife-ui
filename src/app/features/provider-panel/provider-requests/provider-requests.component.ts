import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ServiceRequest } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-provider-requests',
  templateUrl: './provider-requests.component.html',
  styleUrls: ['./provider-requests.component.scss']
})
export class ProviderRequestsComponent implements OnInit {
  requests: ServiceRequest[] = [];
  selectedRequest: ServiceRequest | null = null;
  rejectionReason = '';
  isLoading = false;
  isUpdating = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<ServiceRequest[]>>('/service-requests/provider').subscribe({
      next: (response) => {
        this.requests = response.data || [];
        this.selectedRequest = this.selectedRequest
          ? this.requests.find((request) => request.id === this.selectedRequest?.id) || null
          : this.requests[0] || null;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load incoming requests.';
        this.isLoading = false;
      }
    });
  }

  selectRequest(request: ServiceRequest): void {
    this.selectedRequest = request;
    this.rejectionReason = request.rejectionReason || '';
  }

  acceptRequest(request: ServiceRequest): void {
    this.updateRequest(`/service-requests/${request.id}/accept`, {}, 'Request accepted.');
  }

  rejectRequest(request: ServiceRequest): void {
    this.updateRequest(
      `/service-requests/${request.id}/reject`,
      { rejectionReason: this.rejectionReason },
      'Request rejected.'
    );
  }

  completeRequest(request: ServiceRequest): void {
    this.updateRequest(`/service-requests/${request.id}/complete`, {}, 'Request completed.');
  }

  canAccept(request: ServiceRequest): boolean {
    return this.getStatusKey(request) === 'requested';
  }

  canReject(request: ServiceRequest): boolean {
    return this.getStatusKey(request) === 'requested';
  }

  canComplete(request: ServiceRequest): boolean {
    return this.getStatusKey(request) === 'accepted';
  }

  getStatus(request: ServiceRequest): string {
    return request.status || 'Requested';
  }

  getStatusTone(request: ServiceRequest): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
    switch (this.getStatusKey(request)) {
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

  getServiceName(request: ServiceRequest): string {
    return request.providerService?.serviceName || request.providerService?.name || request.serviceName || 'Service request';
  }

  getPetLabel(request: ServiceRequest): string {
    return request.pet?.petName || request.pet?.name || request.petName || request.petId || 'Pet';
  }

  getCustomerLabel(request: ServiceRequest): string {
    return request.customerName || request.customerUserId || 'Customer';
  }

  private updateRequest(endpoint: string, body: unknown, message: string): void {
    this.isUpdating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.put<ApiResponse<ServiceRequest>>(endpoint, body).subscribe({
      next: (response) => {
        this.selectedRequest = response.data;
        this.successMessage = message;
        this.loadRequests();
      },
      error: () => {
        this.errorMessage = 'Unable to update request.';
      },
      complete: () => {
        this.isUpdating = false;
      }
    });
  }

  private getStatusKey(request: ServiceRequest): string {
    return (request.status || 'requested').toLowerCase();
  }
}
