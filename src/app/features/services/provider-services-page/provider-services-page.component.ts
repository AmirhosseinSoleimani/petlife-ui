import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, from, of, Subscription } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { apiErrorMessage } from '../../../core/api/api-error.util';
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

export interface ProviderDiscoveryCard {
  id: string;
  name: string;
  offerings: ProviderService[];
  representative: ProviderService;
  categoryKeys: string[];
}

/** Categories are inferred from the services already returned for the selected pet. */
export function discoveryCategoryKey(service: ProviderService): string {
  return service.serviceCategoryId || service.serviceDefinitionId ||
    (service.serviceCategoryName || service.category || service.serviceName || service.name || service.id)
      .trim().toLowerCase();
}

export function discoveryCategoryName(service: ProviderService): string {
  const label = service.serviceCategoryName || service.category || service.serviceName || service.name || 'Service';
  return label.replace(/^\[DEMO(?: AU)?\]\s*/i, '').trim();
}

export function groupProviderOfferings(offerings: ProviderService[]): ProviderDiscoveryCard[] {
  const groups = new Map<string, ProviderDiscoveryCard>();
  for (const offering of offerings) {
    // ProviderProfileId is the authoritative business identity, not an offering id.
    const id = offering.providerProfileId || offering.providerId || offering.providerUserId || offering.id;
    let group = groups.get(id);
    if (!group) {
      group = {
        id, name: offering.providerBusinessName || offering.businessName || offering.providerName || 'Provider',
        offerings: [], representative: offering, categoryKeys: []
      };
      groups.set(id, group);
    }
    group.offerings.push(offering);
    const category = discoveryCategoryKey(offering);
    if (!group.categoryKeys.includes(category)) group.categoryKeys.push(category);
  }
  return Array.from(groups.values());
}

export interface ProviderAvailableSlot { startsAtUtc:string; endsAtUtc:string; providerLocalStart:string; }
export interface ProviderAvailability {
  providerProfileId:string; localDate:string; providerTimeZone:string;
  totalDurationMinutes:number; slots:ProviderAvailableSlot[]; checkedAtUtc:string;
}
export interface ProviderServerQuote {
  petId: string;
  providerProfileId: string;
  services: Array<{offeringId:string;serviceName:string;pricingType:string;amount:number|null;currency:string;durationMinutes:number}>;
  currency: string;
  totalDurationMinutes: number;
  priceStatus: 'Exact' | 'MinimumOnly' | 'RequiresQuote';
  exactTotal: number | null;
  indicativeMinimum: number | null;
  calculatedAtUtc: string;
}

export interface ProviderReviewView {
  source: 'demo' | 'verified' | 'loading' | 'unavailable';
  averageRating: number | null;
  ratingCount: number | null;
  reviews: Array<{ rating: number | null; comment: string }>;
  reviewsAvailable: boolean;
}

const NO_REVIEWS: ProviderReviewView = {
  source: 'unavailable', averageRating: null, ratingCount: null, reviews: [], reviewsAvailable: false
};

export function knownDistance(distance: number | null | undefined): number {
  return distance != null && Number.isFinite(distance) && distance >= 0 ? distance : Number.POSITIVE_INFINITY;
}

export function usableRating(rating: ProviderReviewView | undefined): number {
  return rating?.averageRating != null && rating.ratingCount != null && rating.ratingCount > 0 &&
    Number.isFinite(rating.averageRating) && rating.averageRating >= 1 && rating.averageRating <= 5
    ? rating.averageRating : Number.NEGATIVE_INFINITY;
}

/** Sorting is intentionally limited to the provider results returned by the API. */
export function sortDiscoveryResults(items: ProviderService[], reviews: Record<string, ProviderReviewView>,
  mode: 'nearest' | 'rating'): ProviderService[] {
  return [...items].sort((a, b) => {
    const aDistance = knownDistance(a.distanceKm);
    const bDistance = knownDistance(b.distanceKm);
    const aRating = usableRating(reviews[a.providerProfileId || a.id]);
    const bRating = usableRating(reviews[b.providerProfileId || b.id]);
    const distanceOrder = aDistance - bDistance;
    const ratingOrder = bRating - aRating;
    const primary = mode === 'rating' ? ratingOrder : distanceOrder;
    const secondary = mode === 'rating' ? distanceOrder : ratingOrder;
    const safe = (value: number) => Number.isNaN(value) ? 0 : value;
    return safe(primary) || safe(secondary) ||
      (a.providerBusinessName || a.serviceName || a.id)
        .localeCompare(b.providerBusinessName || b.serviceName || b.id);
  });
}

@Component({
  selector: 'app-provider-services-page',
  templateUrl: './provider-services-page.component.html',
  styleUrls: ['./provider-services-page.component.scss']
})
export class ProviderServicesPageComponent implements OnInit, OnDestroy {
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
  selectedGeographyId: string | null = null;
  selectedGeography: GeographyArea | null = null;
  savedProfile: IdentityProfile | null = null;
  isLoadingProfile = true;
  acceptingRequestsOnly = true;
  readonly australianStates = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
  locationState = '';
  locationCity = '';
  locationSuburb = '';
  locationPostcode = '';
  originPostcode = '';
  originState = '';
  originSuburb = '';
  sortBy: 'nearest' | 'rating' = 'nearest';
  providerNameSearch = '';
  providerAddressSearch = '';
  minimumRating = 0;
  selectedProviderKey: string | null = null;
  selectedOfferingIds: string[] = [];
  serverQuote: ProviderServerQuote | null = null;
  isLoadingQuote = false;
  quoteError = '';
  private quoteRequest?: Subscription;
  private quoteRevision = 0;
  availabilityDate = '';
  availabilityResult: ProviderAvailability | null = null;
  availabilityLoading = false;
  availabilityError = '';
  selectedSlotUtc: string | null = null;
  private availabilityRevision = 0;
  private availabilityRequest?: Subscription;
  readonly minimumRatingOptions = [0, 3, 4, 4.5, 5];
  ratings: Record<string, ProviderReviewView> = {};
  private categoriesRequest?: Subscription;
  private servicesRequest?: Subscription;
  private ratingsRequest?: Subscription;
  private recommendationsRequest?: Subscription;
  private profileRequest?: Subscription;
  private petsRequest?: Subscription;
  private preferencesRequest?: Subscription;
  private readonly requestSubscriptions = new Subscription();
  private categoriesRevision = 0;
  private serviceRevision = 0;
  private reviewsApiUnavailable = false;

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

    this.profileRequest = this.apiService.get<ApiResponse<IdentityProfile>>('/v1/identity/profile').subscribe({
      next: response => {
        if (response?.success && response.data) {
          this.savedProfile = response.data;
          this.originPostcode = response.data.postcode || '';
          this.originState = response.data.state || '';
          this.originSuburb = response.data.suburb || '';
          // A late profile read must not override a manually chosen location.
          if (!this.selectedGeography && this.selectedPetId) this.loadServices();
        }
        this.isLoadingProfile = false;
      },
      error: () => { this.isLoadingProfile = false; }
    });
    this.preferencesRequest = this.preferencesService.load().subscribe({
      next: () => this.loadPets(),
      error: () => this.loadPets()
    });
  }

  ngOnDestroy(): void {
    this.categoriesRequest?.unsubscribe();
    this.servicesRequest?.unsubscribe();
    this.ratingsRequest?.unsubscribe();
    this.recommendationsRequest?.unsubscribe();
    this.profileRequest?.unsubscribe();
    this.petsRequest?.unsubscribe();
    this.preferencesRequest?.unsubscribe();
    this.quoteRequest?.unsubscribe();
    this.requestSubscriptions.unsubscribe();
  }

  get originLabel(): string {
    const origin = this.selectedGeography || this.savedProfile;
    if (!origin) return this.i18nService.translate('services.originMissing');
    const address = this.selectedGeography ? '' : (this.savedProfile?.address || '');
    const parts = [address, origin.suburb, origin.city, origin.state, origin.postcode]
      .filter((part, index, values) => !!part && values.indexOf(part) === index);
    return parts.join(', ') || this.i18nService.translate('services.originMissing');
  }

  get hasProfileOrigin(): boolean {
    return !!this.savedProfile && !!(this.savedProfile.postcode || this.savedProfile.suburb);
  }

  useProfileOrigin(): void {
    if (!this.selectedGeography) return;
    this.selectedGeography = null;
    this.selectedGeographyId = null;
    this.loadServices();
  }

  ratingFor(service: ProviderService): ProviderReviewView {
    return this.ratings[service.providerProfileId || service.id] || NO_REVIEWS;
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
    return !!(this.providerNameSearch || this.providerAddressSearch || this.minimumRating ||
      this.locationState || this.locationCity || this.locationSuburb ||
      this.locationPostcode || !this.acceptingRequestsOnly || this.selectedCategoryId);
  }

  clearFilters(): void {
    this.locationState = '';
    this.locationCity = '';
    this.locationSuburb = '';
    this.locationPostcode = '';
    this.providerNameSearch = '';
    this.providerAddressSearch = '';
    this.minimumRating = 0;
    this.selectedCategoryId = null;
    this.acceptingRequestsOnly = true;
    this.applyFilters();
  }

  /** Every filter operates on the fetched pet-compatible results; chips never issue HTTP calls. */
  get visibleServices(): ProviderService[] {
    const filtered = this.isEmergencyRequest
      ? this.services.filter(s => this.isEmergencyService(s)) : this.services;
    const scoped = this.providerId ? filtered.filter(s =>
      this.getServiceProviderIds(s).some(id => this.selectedProviderIds.has(id))) : filtered;
    return sortDiscoveryResults(scoped, this.ratings, this.sortBy);
  }

  get visibleCategories(): ServiceCategory[] {
    const names = new Map<string, string>();
    for (const service of this.visibleServices) {
      const key = discoveryCategoryKey(service);
      if (!names.has(key)) names.set(key, discoveryCategoryName(service));
    }
    return Array.from(names, ([id, name]) => ({id, name}));
  }

  get visibleProviders(): ProviderDiscoveryCard[] {
    const q = this.providerNameSearch.trim().toLowerCase();
    const address = this.providerAddressSearch.trim().toLowerCase();
    const st = this.locationState.trim().toLowerCase();
    const city = this.locationCity.trim().toLowerCase();
    const suburb = this.locationSuburb.trim().toLowerCase();
    const postcode = this.locationPostcode.trim();
    return groupProviderOfferings(this.visibleServices).filter(provider => {
      const offering = provider.representative;
      const rating = usableRating(this.ratings[provider.id]);
      const locality = [
        offering.providerSuburb, offering.providerCity, offering.providerState, offering.providerPostcode
      ].join(' ').toLowerCase();
      return (!q || provider.name.toLowerCase().includes(q)) &&
        (!address || locality.includes(address)) &&
        (!st || (offering.providerState || '').toLowerCase() === st) &&
        (!city || [(offering.providerCity || ''), (offering.providerSuburb || '')]
          .some(part => part.toLowerCase().includes(city))) &&
        (!suburb || (offering.providerSuburb || '').toLowerCase().includes(suburb)) &&
        (!postcode || offering.providerPostcode === postcode) &&
        (!this.minimumRating || rating >= this.minimumRating) &&
        (!this.acceptingRequestsOnly || offering.providerAcceptingRequests !== false) &&
        (!this.selectedCategoryId || provider.categoryKeys.includes(this.selectedCategoryId));
    });
  }

  get selectedProvider(): ProviderDiscoveryCard | null {
    return this.selectedProviderKey
      ? groupProviderOfferings(this.visibleServices).find(p => p.id === this.selectedProviderKey) || null
      : null;
  }

  get selectedOfferings(): ProviderService[] {
    return (this.selectedProvider?.offerings || []).filter(s => this.selectedOfferingIds.includes(s.id));
  }

  get estimatedTotal(): number {
    return this.selectedOfferings.reduce((sum, service) => sum + (service.price || 0), 0);
  }

  get totalMinutes(): number {
    return this.selectedOfferings.reduce((sum, service) => sum + (service.durationMinutes || 0), 0);
  }

  get isExactTotal(): boolean {
    return this.selectedOfferings.length > 0 && this.selectedOfferings.every(s =>
      (s.pricingType === 'Fixed' || !s.pricingType) &&
      typeof s.price === 'number' && Number.isFinite(s.price) && s.price >= 0 && !s.priceMax);
  }

  openProviderDetails(provider: ProviderDiscoveryCard): void {
    this.selectedProviderKey = provider.id;
    this.selectedOfferingIds = [];
    this.invalidateQuote();
  }

  closeProviderDetails(): void {
    this.selectedProviderKey = null;
    this.selectedOfferingIds = [];
    this.invalidateQuote();
  }

  toggleOffering(offeringId: string, checked: boolean): void {
    this.selectedOfferingIds = checked
      ? [...new Set([...this.selectedOfferingIds, offeringId])]
      : this.selectedOfferingIds.filter(id => id !== offeringId);
    this.invalidateQuote();
  }

  private invalidateQuote(): void {
    this.availabilityRequest?.unsubscribe();
    this.availabilityRevision++;
    this.availabilityResult = null;
    this.selectedSlotUtc = null;
    this.availabilityLoading = false;
    this.availabilityError = '';
    this.quoteRequest?.unsubscribe();
    this.quoteRevision++;
    this.serverQuote = null;
    this.isLoadingQuote = false;
    this.quoteError = '';
  }

  get quoteMatchesSelection(): boolean {
    const quote = this.serverQuote;
    if (!quote || !this.selectedPetId || quote.petId !== this.selectedPetId ||
        quote.providerProfileId !== this.selectedProviderKey ||
        quote.services.length !== this.selectedOfferingIds.length) return false;
    // Providers' authoritative quote is ordered. Comparing only sets could
    // accept a stale quote after the customer reorders sequential services.
    return quote.services.every((service, index) =>
      service.offeringId === this.selectedOfferingIds[index]);
  }

  calculateServerQuote(): void {
    this.invalidateQuote();
    const provider = this.selectedProvider;
    if (!this.selectedPetId || !provider || !this.selectedOfferingIds.length ||
        this.selectedOfferingIds.length > 10) {
      this.quoteError = 'Choose between 1 and 10 services.';
      return;
    }
    const revision = this.quoteRevision;
    this.isLoadingQuote = true;
    this.quoteRequest = this.apiService.post<ApiResponse<ProviderServerQuote>>(
      '/provider-services/quote', {
        petId: this.selectedPetId,
        providerProfileId: provider.id,
        offeringIds: [...this.selectedOfferingIds]
      }).subscribe({
      next: response => {
        if (revision !== this.quoteRevision) return;
        this.isLoadingQuote = false;
        if (response?.success && response.data) this.serverQuote = response.data;
        else this.quoteError = response?.message || 'Unable to calculate the current provider quote.';
      },
      error: error => {
        if (revision !== this.quoteRevision) return;
        this.isLoadingQuote = false;
        this.quoteError = apiErrorMessage(error, 'Unable to calculate the current provider quote.');
      }
    });
  }

  onAvailabilityDateChanged(): void {
    // A response for the previous day must not repopulate available slots
    // after the customer changes the date while the request is in flight.
    this.availabilityRequest?.unsubscribe();
    this.availabilityRevision++;
    this.availabilityResult = null;
    this.selectedSlotUtc = null;
    this.availabilityLoading = false;
    this.availabilityError = '';
  }

  checkAvailability(): void {
    this.availabilityRequest?.unsubscribe();
    const revision = ++this.availabilityRevision;
    this.availabilityResult = null;
    this.selectedSlotUtc = null;
    this.availabilityError = '';
    const provider = this.selectedProvider;
    if (!this.quoteMatchesSelection || !this.selectedPetId || !provider ||
        !/^\d{4}-\d{2}-\d{2}$/.test(this.availabilityDate)) {
      this.availabilityError = 'Verify service prices and choose a date first.';
      return;
    }
    this.availabilityLoading = true;
    this.availabilityRequest = this.apiService.post<ApiResponse<ProviderAvailability>>(
      '/provider-services/availability', {
        petId: this.selectedPetId,
        providerProfileId: provider.id,
        offeringIds: [...this.selectedOfferingIds],
        localDate: this.availabilityDate
      }).subscribe({
      next: response => {
        if (revision !== this.availabilityRevision) return;
        this.availabilityLoading = false;
        if (response?.success && response.data) this.availabilityResult = response.data;
        else this.availabilityError = response?.message || 'Unable to load available times.';
      },
      error: error => {
        if (revision !== this.availabilityRevision) return;
        this.availabilityLoading = false;
        this.availabilityError = apiErrorMessage(error, 'Unable to load available times.');
      }
    });
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
    this.petsRequest?.unsubscribe();
    this.petsRequest = this.apiService.get<ApiResponse<Pet[]>>('/v1/pets').subscribe({
      next: (response) => {
        this.pets = response.data || [];
        this.isLoadingPets = false;
        const defaultPetId = this.preferencesService.current.defaultPetId;
        if (!this.selectedPetId && this.pets.length) {
          const initialPet = this.pets.some(pet => pet.id === defaultPetId)
            ? defaultPetId : this.pets[0].id;
          this.selectPet(initialPet);
        }
      },
      error: () => {
        this.errorMessage = 'services.loadPetsError';
        this.isLoadingPets = false;
      }
    });
  }

  selectPet(petId: string | null): void {
    this.servicesRequest?.unsubscribe();
    this.ratingsRequest?.unsubscribe();
    this.recommendationsRequest?.unsubscribe();
    this.serviceRevision++;
    this.selectedPetId = petId;
    this.selectedCategoryId = null;
    this.selectedProviderKey = null;
    this.selectedOfferingIds = [];
    this.invalidateQuote();
    this.services = [];
    this.ratings = {};
    this.errorMessage = '';
    if (petId) this.loadServices();
  }

  selectCategory(categoryId: string | null): void {
    if (categoryId && !this.visibleCategories.some(item => item.id === categoryId)) return;
    this.selectedCategoryId = categoryId;
    this.closeProviderDetails();
  }

  applyFilters(): void {
    // Local filtering only. A new Pet or changed origin explicitly refreshes data.
  }

  onGeographySelected(area: GeographyArea | null): void {
    this.selectedGeography = area;
    this.selectedGeographyId = area?.id || null;
    if (this.selectedPetId) this.loadServices();
  }

  onSortChanged(sort: 'nearest' | 'rating'): void {
    this.sortBy = sort;
  }

  private discoveryError(error: unknown, fallback: string): string {
    return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)
      ? 'services.sessionUnavailable'
      : apiErrorMessage(error, fallback);
  }

  private loadServices(): void {
    this.servicesRequest?.unsubscribe();
    this.ratingsRequest?.unsubscribe();
    this.recommendationsRequest?.unsubscribe();
    const revision = ++this.serviceRevision;
    this.services = [];
    this.ratings = {};
    this.recommendations = [];
    this.closeProviderDetails();
    if (!this.selectedPetId) {
      this.isLoadingServices = false;
      return;
    }
    this.errorMessage = '';
    const params = this.buildSearchParams();
    if (!params) {
      this.isLoadingServices = false;
      this.errorMessage = 'services.invalidPostcode';
      return;
    }
    this.isLoadingServices = true;
    this.servicesRequest = this.apiService.get<ApiResponse<ProviderService[]>>(
      `/provider-services?${params.toString()}`).subscribe({
      next: response => {
        if (revision !== this.serviceRevision) return;
        if (!response?.success || !Array.isArray(response.data)) {
          this.errorMessage = 'services.loadError';
          this.isLoadingServices = false;
          return;
        }
        this.services = response.data.filter(service => service.isActive !== false);
        this.isLoadingServices = false;
        this.loadRatings(this.services, revision);
      },
      error: error => {
        if (revision !== this.serviceRevision) return;
        this.errorMessage = this.discoveryError(error, 'services.loadError');
        this.isLoadingServices = false;
      }
    });
  }

  private buildSearchParams(): URLSearchParams | null {
    const params = new URLSearchParams();
    if (this.selectedPetId) params.set('petId', this.selectedPetId);

    const origin = this.selectedGeography;
    if (origin?.postcode || this.originPostcode) params.set('originPostcode', (origin?.postcode || this.originPostcode).trim());
    if (origin?.state || this.originState) params.set('originState', (origin?.state || this.originState).trim());
    if (origin?.suburb || this.originSuburb) params.set('originSuburb', (origin?.suburb || this.originSuburb).trim());
    return params;
  }

  private loadRatings(items: ProviderService[], revision: number): void {
    for (const service of items.filter(item => item.isDemo)) {
      this.ratings[service.providerProfileId || service.id] = {
        source: 'demo',
        averageRating: service.demoAverageRating ?? null,
        ratingCount: service.demoRatingCount ?? 0,
        reviews: (service.demoReviews || []).slice(0, 3).map(review =>
          ({ rating: review.rating, comment: review.comment })),
        reviewsAvailable: true
      };
    }
    // A single stream with concurrency=2 avoids one request burst per provider.
    const ids = [...new Set(items.filter(item => !item.isDemo).map(item => item.providerProfileId)
      .filter((id): id is string => !!id))].slice(0, 24);
    if (!ids.length || this.reviewsApiUnavailable) return;
    for (const id of ids) this.ratings[id] = { ...NO_REVIEWS, source: 'loading' };
    this.ratingsRequest = from(ids).pipe(
      mergeMap(id => forkJoin({
        rating: this.apiService.get<{ averageRating: number | null; ratingCount: number } | null>(
          `/api/provider-reviews/v1/providers/${id}/rating`).pipe(catchError(() => of(null))),
        reviews: this.apiService.get<{ items: Array<{ rating: number | null; comment: string | null }> }>(
          `/api/provider-reviews/v1/providers/${id}/reviews?size=3`).pipe(catchError(() => of(null)))
      }).pipe(map(result => ({ id, ...result }))), 2)
    ).subscribe(({ id, rating, reviews }) => {
      if (revision !== this.serviceRevision) return;
      if (rating === null && reviews === null) this.reviewsApiUnavailable = true;
      this.ratings[id] = {
        source: rating || reviews ? 'verified' : 'unavailable',
        averageRating: rating?.averageRating ?? null,
        ratingCount: rating?.ratingCount ?? null,
        reviews: (reviews?.items || []).filter((review): review is {rating:number|null;comment:string} =>
          typeof review?.comment === 'string' && !!review.comment.trim()).slice(0, 3),
        reviewsAvailable: !!(rating || reviews)
      };
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
