import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ServiceRequest } from '../../../core/models/marketplace.models';

type RequestFilter = 'all' | 'requested' | 'accepted' | 'completed' | 'rejected';

@Component({
  selector: 'app-provider-requests',
  templateUrl: './provider-requests.component.html',
  styleUrls: ['./provider-requests.component.scss']
})
export class ProviderRequestsComponent implements OnInit {
  requests: ServiceRequest[] = [];
  selectedRequest: ServiceRequest | null = null;
  activeFilter: RequestFilter = 'all';
  isRejectDialogOpen = false;
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
        this.errorMessage = 'providerRequests.loadError';
        this.isLoading = false;
      }
    });
  }

  selectRequest(request: ServiceRequest): void {
    this.selectedRequest = request;
  }

  acceptRequest(request: ServiceRequest): void {
    this.updateRequest(`/service-requests/${request.id}/accept`, {}, 'providerRequests.acceptSuccess');
  }

  openRejectDialog(request: ServiceRequest): void {
    this.selectedRequest = request;
    this.rejectionReason = request.rejectionReason || '';
    this.isRejectDialogOpen = true;
  }

  closeRejectDialog(): void {
    if (this.isUpdating) {
      return;
    }

    this.isRejectDialogOpen = false;
    this.rejectionReason = '';
  }

  rejectRequest(): void {
    if (!this.selectedRequest) {
      return;
    }

    this.updateRequest(
      `/service-requests/${this.selectedRequest.id}/reject`,
      { rejectionReason: this.rejectionReason },
      'providerRequests.rejectSuccess',
      true
    );
  }

  completeRequest(request: ServiceRequest): void {
    this.updateRequest(`/service-requests/${request.id}/complete`, {}, 'providerRequests.completeSuccess');
  }

  setFilter(filter: RequestFilter): void {
    this.activeFilter = filter;
    if (!this.selectedRequest || !this.filteredRequests.some((request) => request.id === this.selectedRequest?.id)) {
      this.selectedRequest = this.filteredRequests[0] || null;
    }
  }

  get filteredRequests(): ServiceRequest[] {
    return this.activeFilter === 'all'
      ? this.requests
      : this.requests.filter((request) => this.getStatusKey(request) === this.activeFilter);
  }

  get requestCounts(): Record<RequestFilter, number> {
    return {
      all: this.requests.length,
      requested: this.requests.filter((request) => this.getStatusKey(request) === 'requested').length,
      accepted: this.requests.filter((request) => this.getStatusKey(request) === 'accepted').length,
      completed: this.requests.filter((request) => this.getStatusKey(request) === 'completed').length,
      rejected: this.requests.filter((request) => this.getStatusKey(request) === 'rejected').length
    };
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
    const status = this.getStatusKey(request);
    return ['requested', 'accepted', 'completed', 'rejected'].includes(status)
      ? `providerRequests.status.${status}`
      : 'providerRequests.status.unknown';
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
    return request.serviceName || request.providerService?.serviceName || request.providerService?.name || '';
  }

  getServiceCategory(request: ServiceRequest): string {
    return request.serviceCategory || request.providerService?.category || '';
  }

  getPetLabel(request: ServiceRequest): string {
    return request.petName || request.pet?.petName || request.pet?.name || '';
  }

  getPetDetails(request: ServiceRequest): string {
    return [
      request.petSpecies || request.pet?.species,
      request.petBreed || request.pet?.breed
    ].filter(Boolean).join(' · ');
  }

  getCustomerLabel(request: ServiceRequest): string {
    return request.customerName || '';
  }

  private updateRequest(endpoint: string, body: unknown, message: string, closeRejectDialog = false): void {
    this.isUpdating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.put<ApiResponse<ServiceRequest>>(endpoint, body).subscribe({
      next: (response) => {
        this.selectedRequest = response.data;
        this.successMessage = message;
        if (closeRejectDialog) {
          this.isRejectDialogOpen = false;
          this.rejectionReason = '';
        }
        this.loadRequests();
      },
      error: () => {
        this.errorMessage = 'providerRequests.updateError';
      },
      complete: () => {
        this.isUpdating = false;
      }
    });
  }

  getStatusKey(request: ServiceRequest): string {
    return (request.status || 'requested').toLowerCase();
  }
}
