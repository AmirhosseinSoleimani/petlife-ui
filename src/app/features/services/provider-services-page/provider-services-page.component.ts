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
    private readonly i18nService: I18nService
  ) {}

  ngOnInit(): void {
    this.providerId = this.route.snapshot.paramMap.get('providerId');
    this.selectedProviderIds = new Set(this.providerId ? [this.providerId] : []);

    if (this.providerId) {
      this.loadSelectedProvider(this.providerId);
    }

    this.loadPets();
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
}
