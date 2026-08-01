import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet } from '../../../core/models/customer-core.models';
import {
  DeliveryMode,
  Provider,
  ProviderService,
  ServiceCategory
} from '../../../core/models/marketplace.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';
import { UserPreferencesService } from '../../../core/preferences/user-preferences.service';

@Component({
  selector: 'app-provider-services-page',
  templateUrl: './provider-services-page.component.html',
  styleUrls: ['./provider-services-page.component.scss']
})
export class ProviderServicesPageComponent implements OnInit {
  pets: Pet[] = [];
  categories: ServiceCategory[] = [];
  services: ProviderService[] = [];
  selectedPetId: string | null = null;
  selectedCategoryId: string | null = null;
  providerId: string | null = null;
  selectedProviderName = '';
  selectedProviderIds = new Set<string>();
  isLoadingPets = false;
  isLoadingCategories = false;
  isLoadingServices = false;
  errorMessage = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly route: ActivatedRoute,
    private readonly i18nService: I18nService,
    private readonly preferencesService: UserPreferencesService
  ) {}

  ngOnInit(): void {
    this.providerId = this.route.snapshot.paramMap.get('providerId');
    this.selectedProviderIds = new Set(this.providerId ? [this.providerId] : []);

    if (this.providerId) {
      this.loadSelectedProvider(this.providerId);
    }

    this.preferencesService.load().subscribe(() => this.loadPets());
  }

  get petOptions(): AppInputOption[] {
    return this.pets.map((pet) => ({
      label: `${pet.petName}${pet.species ? ` — ${pet.species}` : ''}`,
      value: pet.id
    }));
  }

  get selectedPet(): Pet | null {
    return this.pets.find((pet) => pet.id === this.selectedPetId) || null;
  }

  get visibleServices(): ProviderService[] {
    if (!this.providerId) {
      return this.services;
    }

    return this.services.filter((service) =>
      this.getServiceProviderIds(service).some((id) => this.selectedProviderIds.has(id)));
  }

  get pageTitle(): string {
    if (!this.providerId) {
      return 'services.title';
    }

    return this.selectedProviderName
      ? `${this.i18nService.translate('services.providerServicesTitle')} ${this.selectedProviderName}`
      : 'services.providerServicesGenericTitle';
  }

  get pageDescription(): string {
    return this.providerId ? 'services.providerServicesSubtitle' : 'services.subtitle';
  }

  loadPets(): void {
    this.isLoadingPets = true;
    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: (response) => {
        this.pets = response.data || [];
        this.isLoadingPets = false;
        const defaultPetId = this.preferencesService.current.defaultPetId;
        if (!this.selectedPetId && defaultPetId && this.pets.some((pet) => pet.id === defaultPetId)) {
          this.selectPet(defaultPetId);
        }
      },
      error: () => {
        this.errorMessage = 'services.loadPetsError';
        this.isLoadingPets = false;
      }
    });
  }

  selectPet(petId: string | null): void {
    this.selectedPetId = petId;
    this.selectedCategoryId = null;
    this.categories = [];
    this.services = [];
    this.errorMessage = '';

    if (!petId) {
      return;
    }

    this.isLoadingCategories = true;
    this.apiService.get<ApiResponse<ServiceCategory[]>>(`/service-categories?petId=${petId}`).subscribe({
      next: (response) => {
        this.categories = response.data || [];
        this.isLoadingCategories = false;
      },
      error: () => {
        this.errorMessage = 'services.loadCategoriesError';
        this.isLoadingCategories = false;
      }
    });
  }

  selectCategory(categoryId: string): void {
    if (!this.selectedPetId) {
      return;
    }

    this.selectedCategoryId = categoryId;
    this.services = [];
    this.errorMessage = '';
    this.isLoadingServices = true;
    this.apiService.get<ApiResponse<ProviderService[]>>(
      `/provider-services?petId=${this.selectedPetId}&categoryId=${categoryId}`
    ).subscribe({
      next: (response) => {
        this.services = response.data || [];
        this.isLoadingServices = false;
      },
      error: () => {
        this.errorMessage = 'services.loadError';
        this.isLoadingServices = false;
      }
    });
  }

  getServiceName(service: ProviderService): string {
    return service.serviceName || service.name || this.i18nService.translate('services.serviceFallback');
  }

  getProviderName(service: ProviderService): string {
    return service.providerBusinessName
      || service.businessName
      || service.providerName
      || service.provider?.businessName
      || service.provider?.name
      || '';
  }

  getProviderLocation(service: ProviderService): string {
    return [
      service.providerAddressLine1,
      service.providerSuburb,
      service.providerState,
      service.providerPostcode
    ].filter(Boolean).join(', ');
  }

  getDeliveryModeKey(deliveryMode: DeliveryMode | undefined): string {
    switch (deliveryMode) {
      case 'AtCustomerLocation': return 'deliveryMode.atCustomer';
      case 'Online': return 'deliveryMode.online';
      case 'Hybrid': return 'deliveryMode.hybrid';
      default: return 'deliveryMode.atProvider';
    }
  }

  getCategoryIconPath(category: ServiceCategory): string {
    return this.resolveCategoryIconPath([category.iconKey, category.key, category.name].filter(Boolean).join(' '));
  }

  getServiceIconPath(service: ProviderService): string {
    return this.resolveCategoryIconPath([
      service.serviceCategoryName,
      service.category,
      service.serviceName,
      service.name
    ].filter(Boolean).join(' '));
  }

  private loadSelectedProvider(providerId: string): void {
    this.apiService.get<ApiResponse<Provider>>(`/providers/${providerId}`).subscribe({
      next: (response) => {
        const provider = response.data;
        if (!provider) {
          return;
        }

        this.selectedProviderName = provider.businessName || provider.name || '';
        this.getProviderIds(provider).forEach((id) => this.selectedProviderIds.add(id));
      }
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
    return [
      provider.id,
      provider.providerId,
      provider.providerProfileId,
      provider.userId
    ].filter((id): id is string => !!id);
  }

  private resolveCategoryIconPath(value: string): string {
    const normalizedValue = value.toLocaleLowerCase().replace(/[_/-]+/g, ' ');

    if (/(veterinary|medical|vet|clinic|health)/.test(normalizedValue)) {
      return 'M12 3v18M3 12h18';
    }

    if (/(groom|bath|coat|nail)/.test(normalizedValue)) {
      return 'M6 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 8l8 8M16 8 8 16';
    }

    if (/(board|daycare|day care|kennel|stay|sitting)/.test(normalizedValue)) {
      return 'M4 20V9l8-5 8 5v11M8 20v-6h8v6';
    }

    if (/(transport|travel|pickup|mobile|vehicle)/.test(normalizedValue)) {
      return 'M5 17h14l-1.5-7h-11L5 17Zm2.5 0v2M16.5 17v2M8 13h8';
    }

    if (/(walk|exercise|fitness)/.test(normalizedValue)) {
      return 'M8 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9.5 8l2.5 3 3-1 2 3M12 11l-2 4-3 2';
    }

    if (/(train|behavio|specialist|therapy|rehab)/.test(normalizedValue)) {
      return 'm12 3 2.2 4.5 5 .7-3.6 3.5.9 5-5-2.4L7 19l.9-5-3.6-3.5 5-.7L12 3Z';
    }

    return 'M8.3 10.2a2 2 0 1 0-3.8-1.2 2 2 0 0 0 3.8 1.2Zm11.2-1.2a2 2 0 1 0-3.8 1.2A2 2 0 0 0 19.5 9ZM12 8.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Zm0 2.3c-3.5 0-6 2.6-6 5.2 0 2 1.6 3.3 3.5 2.5.9-.4 1.6-.6 2.5-.6s1.6.2 2.5.6c1.9.8 3.5-.5 3.5-2.5 0-2.6-2.5-5.2-6-5.2Z';
  }
}
