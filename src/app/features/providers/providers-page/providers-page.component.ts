import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Provider, ProviderMedia, ProviderService, TrustBadge } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-providers-page',
  templateUrl: './providers-page.component.html',
  styleUrls: ['./providers-page.component.scss']
})
export class ProvidersPageComponent implements OnInit {
  providers: Provider[] = [];
  services: ProviderService[] = [];
  providerGallery: ProviderMedia[] = [];
  selectedProvider: Provider | null = null;
  suburbFilter = '';
  stateFilter = '';
  isLoading = false;
  errorMessage = '';
  isDetailOpen = false;

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadProviders();
  }

  get filteredProviders(): Provider[] {
    return this.providers.filter((provider) => {
      const suburbMatch = !this.suburbFilter || (provider.suburb || '').toLowerCase().includes(this.suburbFilter.toLowerCase());
      const stateMatch = !this.stateFilter || (provider.state || '').toLowerCase().includes(this.stateFilter.toLowerCase());
      return suburbMatch && stateMatch;
    });
  }

  getProviderName(provider: Provider): string {
    return provider.businessName || provider.name || '';
  }

  getProviderRouteId(provider: Provider): string {
    return provider.id || provider.providerId || provider.providerProfileId || provider.userId || '';
  }

  isVerified(provider: Provider): boolean {
    return provider.verificationStatus === 'Approved'
      || !!(provider.isVerified || provider.verified)
      || this.getTrustBadges(provider).some((badge) => badge.key === 'VerifiedProvider');
  }

  getTrustBadges(provider: Provider): TrustBadge[] {
    return (provider.trustBadges || []).filter((badge) => badge.isActive !== false);
  }

  recordContactClick(provider: Provider): void {
    const entityId = this.getProviderRouteId(provider) || null;
    this.apiService.post<ApiResponse<object>>('/product-events', {
      eventType: 'ProviderContactClick',
      entityType: 'Provider',
      entityId
    }).subscribe({ next: () => undefined, error: () => undefined });
  }

  isAvailable(provider: Provider): boolean {
    return provider.isAvailable !== false && provider.isActive !== false && provider.acceptingRequests !== false;
  }

  getProviderServices(provider: Provider): ProviderService[] {
    const providerIds = new Set(this.getProviderIds(provider));
    return this.services.filter((service) => this.getServiceProviderIds(service).some((id) => providerIds.has(id)));
  }

  getProviderCategories(provider: Provider): string[] {
    return Array.from(new Set(this.getProviderServices(provider).map((service) => service.category).filter((category): category is string => !!category))).slice(0, 3);
  }

  loadProviders(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<Provider[]>>('/providers').subscribe({
      next: (response) => {
        this.providers = response.data || [];
        this.loadProviderServices();
        this.isLoading = false;
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'providers.loadError';
        this.isLoading = false;
      }
    });
  }

  selectProvider(provider: Provider): void {
    this.providerGallery = [];
    this.apiService.get<ApiResponse<Provider>>(`/providers/${this.getProviderRouteId(provider)}`).subscribe({
      next: (response) => {
        const resolvedProvider = response.data || provider;
        this.selectedProvider = resolvedProvider;
        this.isDetailOpen = true;
        this.loadProviderGallery(resolvedProvider);
      },
      error: () => {
        this.selectedProvider = provider;
        this.isDetailOpen = true;
        this.loadProviderGallery(provider);
      }
    });
  }

  closeDetails(): void {
    this.isDetailOpen = false;
    this.providerGallery = [];
  }

  galleryUrl(media: ProviderMedia): string {
    return this.apiService.resolvePublicUrl(media.url) || '';
  }

  private loadProviderServices(): void {
    this.apiService.get<ApiResponse<ProviderService[]>>('/provider-services').subscribe({
      next: (response) => this.services = response.data || [],
      error: () => this.services = []
    });
  }

  private loadProviderGallery(provider: Provider): void {
    const providerProfileId = this.getProviderRouteId(provider);
    if (!providerProfileId) {
      this.providerGallery = [];
      return;
    }

    this.apiService.get<ApiResponse<ProviderMedia[]>>(`/provider-media/provider/${providerProfileId}`).subscribe({
      next: (response) => this.providerGallery = response.data || [],
      error: () => this.providerGallery = []
    });
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
    return [provider.id, provider.providerId, provider.providerProfileId, provider.userId]
      .filter((id): id is string => !!id);
  }
}
