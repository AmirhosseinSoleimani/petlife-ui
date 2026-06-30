import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ProviderService } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-provider-services-page',
  templateUrl: './provider-services-page.component.html',
  styleUrls: ['./provider-services-page.component.scss']
})
export class ProviderServicesPageComponent implements OnInit {
  services: ProviderService[] = [];
  categoryFilter = '';
  providerId: string | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const providerId = this.route.snapshot.paramMap.get('providerId');
    this.providerId = providerId || null;
    this.loadServices();
  }

  get filteredServices(): ProviderService[] {
    return this.services.filter((service) => {
      const providerMatch = !this.providerId || service.providerId === this.providerId || service.providerUserId === this.providerId || service.provider?.id === this.providerId;
      const categoryMatch = !this.categoryFilter || (service.category || '').toLowerCase().includes(this.categoryFilter.toLowerCase());
      return providerMatch && categoryMatch;
    });
  }

  getServiceName(service: ProviderService): string {
    return service.name || service.serviceName || 'Provider service';
  }

  getProviderName(service: ProviderService): string {
    return service.provider?.businessName || service.provider?.name || 'Provider';
  }

  loadServices(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<ProviderService[]>>('/provider-services').subscribe({
      next: (response) => {
        this.services = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load provider services.';
        this.isLoading = false;
      }
    });
  }
}
