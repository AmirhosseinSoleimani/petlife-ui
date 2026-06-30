import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Provider, ProviderService } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-provider-services-page',
  templateUrl: './provider-services-page.component.html',
  styleUrls: ['./provider-services-page.component.scss']
})
export class ProviderServicesPageComponent implements OnInit {
  services: ProviderService[] = [];
  categoryFilter = '';
  providerId: string | null = null;
  selectedProviderName = '';
  selectedProviderIds = new Set<string>();
  providerNameById: Record<string, string> = {};
  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly route: ActivatedRoute,
    private readonly i18nService: I18nService
  ) {}

  ngOnInit(): void {
    const providerId = this.route.snapshot.paramMap.get('providerId');
    this.providerId = providerId || null;
    this.selectedProviderIds = new Set(providerId ? [providerId] : []);

    if (this.providerId) {
      this.loadSelectedProvider(this.providerId);
    }

    this.loadServices();
  }

  get filteredServices(): ProviderService[] {
    return this.services.filter((service) => {
      const providerMatch = !this.providerId || this.getServiceProviderIds(service).some((id) => this.selectedProviderIds.has(id));
      const categoryMatch = !this.categoryFilter || (service.category || '').toLowerCase().includes(this.categoryFilter.toLowerCase());
      return providerMatch && categoryMatch;
    });
  }

  get pageTitle(): string {
    if (!this.providerId) {
      return 'Service Catalog';
    }

    return this.selectedProviderName
      ? `${this.i18nService.translate('services.providerServicesTitle')} ${this.selectedProviderName}`
      : 'services.providerServicesGenericTitle';
  }

  get pageDescription(): string {
    return this.providerId
      ? 'services.providerServicesSubtitle'
      : 'The monetizable layer: customer intent, clear pricing, provider context, and request conversion.';
  }

  get emptyStateKey(): string {
    return this.providerId ? 'services.emptyProviderServices' : 'services.emptyCatalog';
  }

  getServiceName(service: ProviderService): string {
    return service.name || service.serviceName || 'Provider service';
  }

  getProviderName(service: ProviderService): string {
    return service.providerBusinessName
      || service.businessName
      || service.providerName
      || service.provider?.businessName
      || service.provider?.name
      || this.lookupProviderName(service)
      || '';
  }

  loadServices(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<ProviderService[]>>('/provider-services').subscribe({
      next: (response) => {
        this.services = response.data || [];
        this.loadProviders();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load provider services.';
        this.isLoading = false;
      }
    });
  }

  private loadProviders(): void {
    this.apiService.get<ApiResponse<Provider[]>>('/providers').subscribe({
      next: (response) => {
        this.providerNameById = (response.data || []).reduce<Record<string, string>>((map, provider) => {
          const providerName = provider.businessName || provider.name || '';
          const providerIds = this.getProviderIds(provider);

          if (providerName) {
            providerIds.forEach((id) => map[id] = providerName);
          }

          if (this.providerId && providerIds.includes(this.providerId)) {
            this.applySelectedProvider(provider);
          }

          return map;
        }, {});
      }
    });
  }

  private loadSelectedProvider(providerId: string): void {
    this.apiService.get<ApiResponse<Provider>>(`/providers/${providerId}`).subscribe({
      next: (response) => {
        if (response.data) {
          this.applySelectedProvider(response.data);
        }
      }
    });
  }

  private applySelectedProvider(provider: Provider): void {
    this.selectedProviderName = provider.businessName || provider.name || this.selectedProviderName;
    this.getProviderIds(provider).forEach((id) => this.selectedProviderIds.add(id));
  }

  private lookupProviderName(service: ProviderService): string {
    const matchedId = this.getServiceProviderIds(service).find((id) => this.providerNameById[id]);
    return matchedId ? this.providerNameById[matchedId] : '';
  }

  private getServiceProviderIds(service: ProviderService): string[] {
    return [
      service.providerId,
      service.providerProfileId,
      service.providerUserId,
      service.provider?.id,
      service.provider?.providerId,
      service.provider?.providerProfileId,
      service.provider?.userId
    ].filter((id): id is string => !!id);
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
