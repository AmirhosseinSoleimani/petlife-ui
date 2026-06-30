import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet } from '../../../core/models/customer-core.models';
import { Provider, ProviderService, ServiceRequest } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-my-requests',
  templateUrl: './my-requests.component.html',
  styleUrls: ['./my-requests.component.scss']
})
export class MyRequestsComponent implements OnInit {
  requests: ServiceRequest[] = [];
  selectedRequest: ServiceRequest | null = null;
  petNameById: Record<string, string> = {};
  serviceById: Record<string, ProviderService> = {};
  providerNameById: Record<string, string> = {};
  isLoading = false;
  errorMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  getPetName(request: ServiceRequest): string {
    return request.pet?.petName
      || request.pet?.name
      || request.petName
      || this.petNameById[request.petId || '']
      || '';
  }

  getServiceName(request: ServiceRequest): string {
    const providerService = this.getProviderService(request);

    return request.providerServiceName
      || request.providerService?.name
      || request.providerService?.serviceName
      || request.serviceName
      || providerService?.name
      || providerService?.serviceName
      || '';
  }

  getProviderName(request: ServiceRequest): string {
    const providerService = this.getProviderService(request);

    return request.providerBusinessName
      || request.businessName
      || request.provider?.businessName
      || request.provider?.name
      || request.providerService?.providerBusinessName
      || request.providerService?.businessName
      || request.providerService?.providerName
      || request.providerService?.provider?.businessName
      || request.providerService?.provider?.name
      || request.providerName
      || providerService?.providerBusinessName
      || providerService?.businessName
      || providerService?.providerName
      || providerService?.provider?.businessName
      || providerService?.provider?.name
      || this.lookupProviderName(request, providerService)
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
        this.loadLookups();
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

  private loadLookups(): void {
    this.loadPets();
    this.loadProviderServices();
    this.loadProviders();
  }

  private loadPets(): void {
    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: (response) => {
        this.petNameById = (response.data || []).reduce<Record<string, string>>((map, pet) => {
          map[pet.id] = pet.petName;
          return map;
        }, {});
      }
    });
  }

  private loadProviderServices(): void {
    this.apiService.get<ApiResponse<ProviderService[]>>('/provider-services').subscribe({
      next: (response) => {
        this.serviceById = (response.data || []).reduce<Record<string, ProviderService>>((map, service) => {
          map[service.id] = service;
          return map;
        }, {});
      }
    });
  }

  private loadProviders(): void {
    this.apiService.get<ApiResponse<Provider[]>>('/providers').subscribe({
      next: (response) => {
        this.providerNameById = (response.data || []).reduce<Record<string, string>>((map, provider) => {
          const providerName = provider.businessName || provider.name || '';

          if (providerName) {
            this.getProviderIds(provider).forEach((id) => map[id] = providerName);
          }

          return map;
        }, {});
      }
    });
  }

  private getProviderService(request: ServiceRequest): ProviderService | null {
    return request.providerService || this.serviceById[request.providerServiceId || ''] || null;
  }

  private lookupProviderName(request: ServiceRequest, providerService: ProviderService | null): string {
    const providerIds = [
      request.providerId,
      request.providerProfileId,
      request.providerUserId,
      providerService?.providerId,
      providerService?.providerProfileId,
      providerService?.providerUserId,
      providerService?.provider?.id,
      providerService?.provider?.providerId,
      providerService?.provider?.providerProfileId,
      providerService?.provider?.userId
    ].filter((id): id is string => !!id);

    const matchedId = providerIds.find((id) => this.providerNameById[id]);
    return matchedId ? this.providerNameById[matchedId] : '';
  }

  private getProviderIds(provider: Provider): string[] {
    return [
      provider.id,
      provider.providerId,
      provider.providerProfileId,
      provider.userId
    ].filter((id): id is string => !!id);
  }
}
