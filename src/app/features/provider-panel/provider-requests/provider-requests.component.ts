import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ProviderLeadDashboard, ServiceRequest } from '../../../core/models/marketplace.models';
import { UserPreferencesService } from '../../../core/preferences/user-preferences.service';

type RequestFilter = 'all' | 'requested' | 'responding' | 'accepted' | 'completed' | 'rejected';

@Component({ selector: 'app-provider-requests', templateUrl: './provider-requests.component.html', styleUrls: ['./provider-requests.component.scss'] })
export class ProviderRequestsComponent implements OnInit {
  requests: ServiceRequest[] = [];
  selectedRequest: ServiceRequest | null = null;
  dashboard: ProviderLeadDashboard | null = null;
  activeFilter: RequestFilter = 'all';
  readonly requestFilterOptions: ReadonlyArray<{
  v: RequestFilter;
  l: string;
}> = [
  { v: 'all', l: 'All' },
  { v: 'requested', l: 'New' },
  { v: 'responding', l: 'Responding' },
  { v: 'accepted', l: 'Accepted' },
  { v: 'completed', l: 'Completed' },
  { v: 'rejected', l: 'Rejected' }
];

  responseMessage = '';
  proposedServiceAt = '';
  rejectionReason = '';
  isRejectDialogOpen = false;
  isLoading = false;
  isUpdating = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService, private readonly preferencesService: UserPreferencesService) {}

  ngOnInit(): void {
    this.preferencesService.load().subscribe(() => { this.loadDashboard(); this.loadRequests(); });
  }

  loadDashboard(): void {
    this.apiService.get<ApiResponse<ProviderLeadDashboard>>('/provider-dashboard/summary').subscribe({ next: r => this.dashboard = r.data || null });
  }

  loadRequests(): void {
    this.isLoading = true; this.errorMessage = '';
    this.apiService.get<ApiResponse<ServiceRequest[]>>('/service-requests/provider').subscribe({
      next: response => {
        this.requests = response.data || [];
        const visible = this.filteredRequests;
        this.selectedRequest = this.selectedRequest ? visible.find(x => x.id === this.selectedRequest?.id) || visible[0] || null : visible[0] || null;
        this.isLoading = false;
      },
      error: () => { this.errorMessage = 'Unable to load incoming requests.'; this.isLoading = false; }
    });
  }

  selectRequest(request: ServiceRequest): void {
    this.selectedRequest = request; this.responseMessage = request.providerResponseMessage || ''; this.proposedServiceAt = '';
    if (this.status(request) === 'requested') this.updateRequest(`/service-requests/${request.id}/view`, {}, '', false, false);
  }

  setFilter(filter: RequestFilter): void { this.activeFilter = filter; this.selectedRequest = this.filteredRequests[0] || null; }
  get filteredRequests(): ServiceRequest[] {
    if (this.activeFilter === 'all') return this.requests;
    if (this.activeFilter === 'responding') return this.requests.filter(x => ['viewed','needmoreinfo','available','contacted'].includes(this.status(x)));
    return this.requests.filter(x => this.status(x) === this.activeFilter);
  }
  get requestCounts(): Record<RequestFilter, number> {
    return {
      all: this.requests.length,
      requested: this.requests.filter(x => this.status(x) === 'requested').length,
      responding: this.requests.filter(x => ['viewed','needmoreinfo','available','contacted'].includes(this.status(x))).length,
      accepted: this.requests.filter(x => this.status(x) === 'accepted').length,
      completed: this.requests.filter(x => this.status(x) === 'completed').length,
      rejected: this.requests.filter(x => this.status(x) === 'rejected').length
    };
  }

  needMoreInfo(request: ServiceRequest): void {
    if (!this.responseMessage.trim()) { this.errorMessage = 'Add a message describing the information you need.'; return; }
    this.updateRequest(`/service-requests/${request.id}/need-more-info`, { message: this.responseMessage.trim() }, 'Request marked as needing more information.');
  }
  markAvailable(request: ServiceRequest): void { this.updateRequest(`/service-requests/${request.id}/available`, { message: this.responseMessage.trim() || null }, 'Availability response sent.'); }
  markContacted(request: ServiceRequest): void { this.updateRequest(`/service-requests/${request.id}/contacted`, { message: this.responseMessage.trim() || null }, 'Request marked as contacted.'); }
  acceptRequest(request: ServiceRequest): void { this.updateRequest(`/service-requests/${request.id}/accept`, {}, 'Request accepted.'); }
  completeRequest(request: ServiceRequest): void { this.updateRequest(`/service-requests/${request.id}/complete`, {}, 'Request completed.'); }
  proposeBooking(request: ServiceRequest): void {
    if (!this.proposedServiceAt) { this.errorMessage = 'Choose a proposed service date and time.'; return; }
    const parsed = new Date(this.proposedServiceAt); if (Number.isNaN(parsed.getTime())) { this.errorMessage = 'The proposed service time is invalid.'; return; }
    this.updateRequest(`/service-requests/${request.id}/booking/propose`, { proposedServiceAt: parsed.toISOString(), message: this.responseMessage.trim() || null }, 'Booking time proposed to the customer.');
  }

  openRejectDialog(request: ServiceRequest): void { this.selectedRequest = request; this.rejectionReason = request.rejectionReason || ''; this.isRejectDialogOpen = true; }
  closeRejectDialog(): void { if (!this.isUpdating) { this.isRejectDialogOpen = false; this.rejectionReason = ''; } }
  rejectRequest(): void {
    if (!this.selectedRequest) return;
    this.updateRequest(`/service-requests/${this.selectedRequest.id}/reject`, { rejectionReason: this.rejectionReason.trim() || null }, 'Request rejected.', true);
  }

  canNeedMoreInfo(r: ServiceRequest): boolean { return ['requested','viewed'].includes(this.status(r)); }
  canAvailable(r: ServiceRequest): boolean { return ['requested','viewed','needmoreinfo'].includes(this.status(r)); }
  canContact(r: ServiceRequest): boolean { return ['available','accepted'].includes(this.status(r)); }
  canAccept(r: ServiceRequest): boolean { return ['requested','viewed','needmoreinfo','available','contacted'].includes(this.status(r)); }
  canReject(r: ServiceRequest): boolean { return !['rejected','completed'].includes(this.status(r)); }
  canComplete(r: ServiceRequest): boolean { return ['accepted','contacted'].includes(this.status(r)); }
  canProposeBooking(r: ServiceRequest): boolean { return ['available','accepted','contacted'].includes(this.status(r)); }

  getStatusTone(request: ServiceRequest): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
    const status = this.status(request); if (status === 'completed') return 'info'; if (status === 'accepted') return 'success'; if (status === 'rejected') return 'danger'; if (['requested','needmoreinfo'].includes(status)) return 'warning'; if (['viewed','available','contacted'].includes(status)) return 'info'; return 'neutral';
  }
  getServiceName(r: ServiceRequest): string { return r.serviceName || r.providerService?.serviceName || r.providerService?.name || 'Service'; }
  getPetLabel(r: ServiceRequest): string { return r.petName || r.pet?.petName || r.pet?.name || (r.consentSharePetProfile ? 'Pet' : 'Not shared'); }
  getCustomerLabel(r: ServiceRequest): string { return r.customerName || (r.consentShareContactDetails ? 'Customer' : 'Contact not shared'); }
  status(r: ServiceRequest): string { return (r.status || 'Requested').toLowerCase(); }

  private updateRequest(endpoint: string, body: unknown, message: string, closeReject = false, refreshDashboard = true): void {
    this.isUpdating = true; this.errorMessage = ''; if (message) this.successMessage = '';
    this.apiService.put<ApiResponse<ServiceRequest>>(endpoint, body).subscribe({
      next: response => {
        if (response.data) this.selectedRequest = response.data;
        if (message) this.successMessage = message;
        if (closeReject) { this.isRejectDialogOpen = false; this.rejectionReason = ''; }
        this.loadRequests(); if (refreshDashboard) this.loadDashboard();
      },
      error: err => { this.errorMessage = err?.error?.errors?.join(' ') || err?.error?.message || 'Unable to update the request.'; this.isUpdating = false; },
      complete: () => this.isUpdating = false
    });
  }
}
