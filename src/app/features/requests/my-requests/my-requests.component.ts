import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ServiceRequest } from '../../../core/models/marketplace.models';
import { UserPreferencesService } from '../../../core/preferences/user-preferences.service';

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
  statusFilter: 'all' | 'active' | 'completed' | 'rejected' = 'all';

  readonly statusFilters: Array<{ value: 'all' | 'active' | 'completed' | 'rejected'; label: string }> = [
    { value: 'all', label: 'requests.filterAll' },
    { value: 'active', label: 'requests.filterActive' },
    { value: 'completed', label: 'requests.filterCompleted' },
    { value: 'rejected', label: 'requests.filterRejected' }
  ];

  constructor(
    private readonly apiService: ApiService,
    private readonly preferencesService: UserPreferencesService
  ) {}

  ngOnInit(): void {
    this.preferencesService.load().subscribe((preferences) => {
      const filter = (preferences.customerDefaultRequestFilter || 'All').toLowerCase();
      if (['all', 'active', 'completed', 'rejected'].includes(filter)) {
        this.statusFilter = filter as typeof this.statusFilter;
      }
      this.loadRequests();
    });
  }

  getPetName(request: ServiceRequest): string {
    return request.petName || request.pet?.petName || request.pet?.name || '';
  }

  getServiceName(request: ServiceRequest): string {
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
    return request.requestedDate || request.scheduledDate || request.createdAt || '';
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

  get filteredRequests(): ServiceRequest[] {
    if (this.statusFilter === 'all') {
      return this.requests;
    }
    return this.requests.filter((request) => {
      const status = this.getStatus(request).toLowerCase();
      if (this.statusFilter === 'active') {
        return status !== 'completed' && status !== 'rejected';
      }
      return status === this.statusFilter;
    });
  }

  getFilterCount(filter: 'all' | 'active' | 'completed' | 'rejected'): number {
    if (filter === 'all') {
      return this.requests.length;
    }
    return this.requests.filter((request) => {
      const status = this.getStatus(request).toLowerCase();
      return filter === 'active' ? status !== 'completed' && status !== 'rejected' : status === filter;
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
        this.successMessage = 'Booking time confirmed.';
        this.loadRequests();
      },
      error: err => { this.errorMessage = err?.error?.errors?.join(' ') || err?.error?.message || 'Unable to confirm booking.'; this.isUpdating = false; },
      complete: () => this.isUpdating = false
    });
  }

  loadRequests(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<ServiceRequest[]>>('/service-requests/my').subscribe({
      next: (response) => {
        this.requests = response.data || [];
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
