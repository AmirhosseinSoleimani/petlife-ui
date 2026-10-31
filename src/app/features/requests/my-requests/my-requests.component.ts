import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

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
  successMessage = '';
  isUpdating = false;
  readonly isHistoryPage: boolean;
  statusFilter: 'all' | 'active' | 'completed' | 'rejected' = 'all';

  readonly statusFilters: Array<{ value: 'all' | 'active' | 'completed' | 'rejected'; label: string }> = [
    { value: 'all', label: 'requests.filterAll' },
    { value: 'active', label: 'requests.filterActive' },
    { value: 'completed', label: 'requests.filterCompleted' },
    { value: 'rejected', label: 'requests.filterRejected' }
  ];

  constructor(
    private readonly apiService: ApiService,
    private readonly route: ActivatedRoute
  ) {
    this.isHistoryPage = this.route.snapshot.data['view'] === 'history';
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  getPetName(request: ServiceRequest): string {
    return request.petName || request.pet?.petName || request.pet?.name || '';
  }

  getServiceName(request: ServiceRequest): string {
    if (request.proforma?.services?.length) {
      const services = request.proforma.services;
      return services.length === 1
        ? services[0].serviceName
        : `${services.length} services · ${services[0].serviceName} + ${services[1].serviceName}${services.length > 2 ? ' …' : ''}`;
    }
    return request.serviceName
      || request.providerServiceName
      || request.providerService?.serviceName
      || request.providerService?.name
      || '';
  }

  getProviderName(request: ServiceRequest): string {
    return request.providerBusinessName
      || request.businessName
      || request.providerName
      || request.provider?.businessName
      || request.provider?.name
      || request.providerService?.providerBusinessName
      || request.providerService?.providerName
      || '';
  }

  getRequestDate(request: ServiceRequest): string {
    return request.scheduledDate || request.requestedDate || request.createdAt || '';
  }

  hasProforma(request: ServiceRequest): boolean {
    // Never synthesize an invoice from a service card's current catalog price.
    return !!(request.proforma &&
      request.proforma.services?.length &&
      Number.isFinite(request.proforma.servicesTotal) &&
      request.proforma.currency);
  }

  getStatus(request: ServiceRequest): string {
    return request.status || 'Requested';
  }

  getStatusTone(request: ServiceRequest): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
    switch (this.getStatus(request).toLowerCase()) {
      case 'accepted': return 'success';
      case 'rejected': return 'danger';
      case 'completed': return 'info';
      case 'requested': case 'needmoreinfo': return 'warning';
      case 'viewed': case 'available': case 'contacted': return 'info';
      default: return 'neutral';
    }
  }

  get activeRequests(): ServiceRequest[] {
    return this.requests.filter(request => this.isActiveRequest(request));
  }

  get completedRequestsCount(): number {
    return this.requests.filter(request => !this.isActiveRequest(request)).length;
  }

  get filteredRequests(): ServiceRequest[] {
    // The Requests landing page always shows active work regardless of saved preferences.
    if (!this.isHistoryPage) return this.activeRequests;
    if (this.statusFilter === 'all') return this.requests;
    return this.requests.filter(request => {
      const status = this.getStatus(request).toLowerCase();
      return this.statusFilter === 'active' ? this.isActiveRequest(request) : status === this.statusFilter;
    });
  }

  private isActiveRequest(request: ServiceRequest): boolean {
    const status = this.getStatus(request).toLowerCase();
    return !['completed', 'rejected', 'cancelled', 'canceled', 'withdrawn'].includes(status);
  }

  getFilterCount(filter: 'all' | 'active' | 'completed' | 'rejected'): number {
    if (filter === 'all') {
      return this.requests.length;
    }
    return this.requests.filter((request) => {
      const status = this.getStatus(request).toLowerCase();
      return filter === 'active' ? this.isActiveRequest(request) : status === filter;
    }).length;
  }

  getStatusStep(request: ServiceRequest): number {
    switch (this.getStatus(request).toLowerCase()) {
      case 'viewed': case 'needmoreinfo': case 'available': case 'contacted': return 2;
      case 'accepted': case 'completed': case 'rejected': return 3;
      default: return 1;
    }
  }

  confirmBooking(request: ServiceRequest): void {
    this.isUpdating = true; this.errorMessage = ''; this.successMessage = '';
    this.apiService.put<ApiResponse<ServiceRequest>>(`/service-requests/${request.id}/booking/confirm`, { confirm: true }).subscribe({
      next: response => {
        this.selectedRequest = response.data || request;
        this.successMessage = 'requests.bookingConfirmedSuccess';
        this.loadRequests();
      },
      error: err => { this.errorMessage = err?.error?.errors?.join(' ') || err?.error?.message || 'requests.bookingConfirmError'; this.isUpdating = false; },
      complete: () => this.isUpdating = false
    });
  }

  loadRequests(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<ServiceRequest[]>>('/v1/service-requests/my').subscribe({
      next: (response) => {
        this.requests = response?.success && Array.isArray(response.data) ? response.data : [];
        this.selectedRequest = this.selectedRequest && this.filteredRequests.some(item => item.id === this.selectedRequest?.id)
          ? this.selectedRequest : null;
        if (!response?.success) this.errorMessage = 'requests.loadError';
        this.isLoading = false;
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'requests.loadError';
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
