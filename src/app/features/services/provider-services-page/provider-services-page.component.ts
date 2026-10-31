import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet } from '../../../core/models/customer-core.models';
import { IdentityProfile } from '../../../core/models/auth.models';
import {
  DeliveryMode,
  GeographyArea,
  Provider,
  ProviderExpertise,
  ProviderRecommendation,
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
  readonly isEmergencyRequest: boolean;
  pets: Pet[] = [];
  categories: ServiceCategory[] = [];
  services: ProviderService[] = [];
  recommendations: ProviderRecommendation[] = [];
  selectedRecommendationDefinitionId: string | null = null;
  isLoadingRecommendations = false;
  selectedPetId: string | null = null;
  selectedCategoryId: string | null = null;
  providerId: string | null = null;
  selectedProviderName = '';
  selectedProviderIds = new Set<string>();
  isLoadingPets = false;
  isLoadingCategories = false;
  isLoadingServices = false;
  errorMessage = '';
  deliveryMode: DeliveryMode | '' = '';
  selectedGeographyId: string | null = null;
  selectedGeography: GeographyArea | null = null;
  acceptingRequestsOnly = true;
  openNowOnly = false;
  afterHoursOnly = false;
  locationState = '';
  locationCity = '';
  locationSuburb = '';
  locationPostcode = '';
  originPostcode = '';
  originState = '';
  originSuburb = '';
  sortBy: 'nearest' | 'rating' = 'nearest';
  ratings: Record<string, {averageRating: number | null; ratingCount: number; reviews: Array<{rating: number | null; comment: string | null}>}> = {};

  constructor(
    private readonly apiService: ApiService,
    private readonly route: ActivatedRoute,
    private readonly i18nService: I18nService,
    private readonly preferencesService: UserPreferencesService
  ) {
    this.isEmergencyRequest = this.route.snapshot.data['requestKind'] === 'emergency';
  }

  ngOnInit(): void {
    this.providerId = this.route.snapshot.paramMap.get('providerId');
    this.selectedProviderIds = new Set(this.providerId ? [this.providerId] : []);

    if (this.providerId) {
      this.loadSelectedProvider(this.providerId);
    }

    this.apiService.get<ApiResponse<IdentityProfile>>('/v1/identity/profile').subscribe({
      next: response => {
        const profile = response.data;
        if (!profile) return;
        this.originPostcode = profile.postcode || '';
        this.originState = profile.state || '';
        this.originSuburb = profile.suburb || '';
      },
      error: () => undefined
    });
    this.preferencesService.load().subscribe(() => this.loadPets());
  }

  readonly deliveryModeOptions: AppInputOption[] = [
    { label: 'All delivery modes', value: '' },
    { label: 'deliveryMode.atProvider', value: 'AtProviderLocation' },
    { label: 'deliveryMode.atCustomer', value: 'AtCustomerLocation' },
    { label: 'deliveryMode.online', value: 'Online' },
    { label: 'deliveryMode.hybrid', value: 'Hybrid' }
  ];

  get petOptions(): AppInputOption[] {
    return this.pets.map((pet) => ({
      label: `${pet.petName}${pet.species ? ` — ${pet.species}` : ''}`,
      value: pet.id
    }));
  }

  get selectedPet(): Pet | null {
    return this.pets.find((pet) => pet.id === this.selectedPetId) || null;
  }

  get recommendationDefinitionOptions(): AppInputOption[] {
    const seen = new Set<string>();
    return this.services
      .filter((service) => !!service.serviceDefinitionId)
      .filter((service) => {
        const id = service.serviceDefinitionId!;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((service) => ({
        label: this.getServiceName(service),
        value: service.serviceDefinitionId!
      }));
  }

  get hasSearchFilters(): boolean {
    return !!(
      this.deliveryMode ||
      this.selectedGeographyId ||
      this.acceptingRequestsOnly ||
      this.openNowOnly ||
      this.afterHoursOnly || this.locationState || this.locationCity ||
      this.locationSuburb || this.locationPostcode
    );
  }

  clearFilters(): void {
    this.deliveryMode = '';
    this.selectedGeographyId = null;
    this.selectedGeography = null;
    this.acceptingRequestsOnly = false;
    this.openNowOnly = false;
    this.afterHoursOnly = false;
    this.locationState = '';
    this.locationCity = '';
    this.locationSuburb = '';
    this.locationPostcode = '';
    this.sortBy = 'nearest';
    this.applyFilters();
  }

  get visibleServices(): ProviderService[] {
    const services = this.isEmergencyRequest
      ? this.services.filter(service => this.isEmergencyService(service)) : this.services;
    const sorted = [...services].sort((a,b) => this.sortBy === 'rating'
      ? (this.ratings[b.providerProfileId || '']?.averageRating ?? -1) -
        (this.ratings[a.providerProfileId || '']?.averageRating ?? -1) ||
        (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
      : (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    if (!this.providerId) return sorted;
    return sorted.filter(service =>
      this.getServiceProviderIds(service).some(id => this.selectedProviderIds.has(id)));
  }

  get visibleCategories(): ServiceCategory[] {
    return this.isEmergencyRequest
      ? this.categories.filter(category => this.isEmergencyCategory(category))
      : this.categories;
  }

  private isEmergencyCategory(category: ServiceCategory): boolean {
    return /emergency|urgent|after.?hours|veterinar|vet|medical|clinic/i.test(
      [category.key, category.name, category.description].filter(Boolean).join(' '));
  }

  private isEmergencyService(service: ProviderService): boolean {
    return service.providerAcceptingRequests !== false &&
      (service.providerTypes || []).some(type => /veterinar|vet|clinic/i.test(type)) ||
      service.providerAcceptingRequests !== false &&
      /emergency|urgent|after.?hours|veterinar|vet|medical|clinic/i.test(
        [service.serviceName, service.name, service.serviceCategoryName, service.category]
          .filter(Boolean).join(' '));
  }

  get pageTitle(): string {
    if (!this.providerId) {
      return this.isEmergencyRequest ? 'requests.emergencyServicesTitle' : 'requests.careServicesTitle';
    }

    return this.selectedProviderName
      ? `${this.i18nService.translate('services.providerServicesTitle')} ${this.selectedProviderName}`
      : 'services.providerServicesGenericTitle';
  }

  get pageDescription(): string {
    return this.providerId ? 'services.providerServicesSubtitle' :
      this.isEmergencyRequest ? 'requests.emergencyServicesDescription' : 'services.subtitle';
  }

  loadPets(): void {
    this.isLoadingPets = true;
    this.apiService.get<ApiResponse<Pet[]>>('/v1/pets').subscribe({
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
    this.recommendations = [];
    this.selectedRecommendationDefinitionId = null;
    this.errorMessage = '';

    if (!petId) {
      return;
    }

    this.isLoadingCategories = true;
    this.apiService.get<ApiResponse<ServiceCategory[]>>(`/service-categories?petId=${petId}`).subscribe({
      next: (response) => {
        this.categories = response?.success && Array.isArray(response.data) ? response.data : [];
        if (!response?.success) this.errorMessage = 'services.loadCategoriesError';
        this.isLoadingCategories = false;
      },
      error: () => {
        this.errorMessage = 'services.loadCategoriesError';
        this.isLoadingCategories = false;
      }
    });
  }

  selectCategory(categoryId: string): void {
    if (!this.selectedPetId || (this.isEmergencyRequest &&
        !this.visibleCategories.some(category => category.id === categoryId))) return;

    this.selectedCategoryId = categoryId;
    this.loadServices();
  }

  applyFilters(): void {
    if (this.selectedCategoryId) this.loadServices();
  }

  onGeographySelected(area: GeographyArea | null): void {
    this.selectedGeography = area;
    this.selectedGeographyId = area?.id || null;
  }

  private loadServices(): void {
    if (!this.selectedPetId || !this.selectedCategoryId) return;
    this.services = [];
    this.errorMessage = '';
    this.isLoadingServices = true;
    const params = this.buildSearchParams();
    this.apiService.get<ApiResponse<ProviderService[]>>(`/provider-services?${params.toString()}`).subscribe({
      next: (response) => {
        this.services = response.data || [];
        this.loadRatings(this.services);
        this.isLoadingServices = false;
        this.recordProductEvent('ProviderSearch', 'ServiceCategory', this.selectedCategoryId);

        if (!this.providerId) {
          const firstDefinition = this.recommendationDefinitionOptions[0]?.value as string | undefined;
          this.selectedRecommendationDefinitionId = firstDefinition || null;
          this.loadRecommendations();
        }
      },
      error: () => {
        this.errorMessage = 'services.loadError';
        this.isLoadingServices = false;
      }
    });
  }

  selectRecommendationDefinition(serviceDefinitionId: string | null): void {
    this.selectedRecommendationDefinitionId = serviceDefinitionId;
    this.loadRecommendations();
  }

  private loadRecommendations(): void {
    if (this.providerId || !this.selectedPetId || !this.selectedCategoryId || !this.selectedRecommendationDefinitionId) {
      this.recommendations = [];
      return;
    }

    const params = this.buildSearchParams();
    params.set('serviceDefinitionId', this.selectedRecommendationDefinitionId);
    this.isLoadingRecommendations = true;
    this.apiService.get<ApiResponse<ProviderRecommendation[]>>(`/provider-recommendations?${params.toString()}`).subscribe({
      next: (response) => {
        this.recommendations = (response.data || []).slice(0, 3);
        this.isLoadingRecommendations = false;
      },
      error: () => {
        this.recommendations = [];
        this.isLoadingRecommendations = false;
      }
    });
  }

  private buildSearchParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (this.selectedPetId) params.set('petId', this.selectedPetId);
    if (this.selectedCategoryId) params.set('categoryId', this.selectedCategoryId);
    if (this.deliveryMode) params.set('deliveryMode', this.deliveryMode);
    if (this.selectedGeographyId) params.set('geographyAreaId', this.selectedGeographyId);
    if (this.acceptingRequestsOnly) params.set('acceptingRequests', 'true');
    if (this.openNowOnly) params.set('openNow', 'true');
    if (this.afterHoursOnly) params.set('afterHours', 'true');
    if (this.locationState.trim()) params.set('state', this.locationState.trim());
    if (this.locationCity.trim()) params.set('city', this.locationCity.trim());
    if (this.locationSuburb.trim()) params.set('suburb', this.locationSuburb.trim());
    if (this.locationPostcode.trim()) params.set('postcode', this.locationPostcode.trim());
    const origin = this.selectedGeography || null;
    const originPostcode = origin?.postcode || this.originPostcode;
    if (originPostcode) params.set('originPostcode', originPostcode);
    const originState = origin?.state || this.originState;
    if (originState) params.set('originState', originState);
    const originSuburb = origin?.suburb || this.originSuburb;
    if (originSuburb) params.set('originSuburb', originSuburb);
    return params;
  }

  private loadRatings(items: ProviderService[]): void {
    const ids = [...new Set(items.map(s => s.providerProfileId).filter((id): id is string => !!id))].slice(0, 100);
    if (!ids.length) return;
    forkJoin(ids.map(id => forkJoin({
      rating: this.apiService.get<{averageRating: number | null; ratingCount: number} | null>(
        `/provider-reviews/v1/providers/${id}/rating`).pipe(catchError(() => of(null))),
      reviews: this.apiService.get<{items: Array<{rating: number | null; comment: string | null}>}>(
        `/provider-reviews/v1/providers/${id}/reviews?size=3`).pipe(catchError(() => of({items: []})))
    }).pipe(map(result => ({id, ...result}))))).subscribe({
      next: results => results.forEach(x => {
        this.ratings[x.id] = {
          averageRating: x.rating?.averageRating ?? null,
          ratingCount: x.rating?.ratingCount ?? 0,
          reviews: (x.reviews?.items || []).filter(review => !!review.comment)
        };
      }),
      error: () => undefined
    });
  }

  private recordProductEvent(eventType: string, entityType?: string, entityId?: string | null): void {
    this.apiService.post<ApiResponse<object>>('/product-events', {
      eventType,
      entityType: entityType || null,
      entityId: entityId || null
    }).subscribe({ next: () => undefined, error: () => undefined });
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

  getTopExpertise(service: ProviderService): ProviderExpertise | null {
    return service.providerExpertise && service.providerExpertise.length > 0
      ? service.providerExpertise[0]
      : null;
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
