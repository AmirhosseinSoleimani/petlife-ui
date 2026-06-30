import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Provider } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-providers-page',
  templateUrl: './providers-page.component.html',
  styleUrls: ['./providers-page.component.scss']
})
export class ProvidersPageComponent implements OnInit {
  providers: Provider[] = [];
  selectedProvider: Provider | null = null;
  suburbFilter = '';
  stateFilter = '';
  isLoading = false;
  errorMessage = '';

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
    return provider.businessName || provider.name || 'Provider';
  }

  getProviderRouteId(provider: Provider): string {
    return provider.id || provider.providerId || provider.providerProfileId || provider.userId || '';
  }

  isVerified(provider: Provider): boolean {
    return !!(provider.isVerified || provider.verified);
  }

  isAvailable(provider: Provider): boolean {
    return provider.isAvailable !== false && provider.isActive !== false;
  }

  loadProviders(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<Provider[]>>('/providers').subscribe({
      next: (response) => {
        this.providers = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load providers.';
        this.isLoading = false;
      }
    });
  }

  selectProvider(provider: Provider): void {
    this.apiService.get<ApiResponse<Provider>>(`/providers/${provider.id}`).subscribe({
      next: (response) => {
        this.selectedProvider = response.data;
      },
      error: () => {
        this.selectedProvider = provider;
      }
    });
  }
}
