import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { EmergencyVet } from '../../../core/models/customer-core.models';

interface EmergencyVetWire extends EmergencyVet {
  emergencyVetId?: string;
  city?: string;
  fullAddress?: string;
  streetAddress?: string;
  supportedSpeciesNames?: string[];
  species?: string[] | string;
}

interface EmergencyVetCollection {
  items?: EmergencyVetWire[];
  results?: EmergencyVetWire[];
  emergencyVets?: EmergencyVetWire[];
}

type EmergencyVetPayload = EmergencyVetWire[] | EmergencyVetCollection | null;
type EmergencyVetResponse = ApiResponse<EmergencyVetPayload> | EmergencyVetPayload;
type EmergencyVetDetailResponse = ApiResponse<EmergencyVetWire | null> | EmergencyVetWire | null;

interface SpeciesCollection {
  items?: Array<string | { name?: string }>;
  results?: Array<string | { name?: string }>;
  species?: Array<string | { name?: string }>;
}

type SpeciesPayload = string[] | SpeciesCollection | null;
type SpeciesResponse = ApiResponse<SpeciesPayload> | SpeciesPayload;

interface EmergencyVetView {
  id: string;
  clinicName: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  phone: string;
  email: string;
  website: string;
  isAfterHours: boolean;
  is24Hours: boolean;
  description: string;
  supportedSpecies: string[];
  isVerified: boolean;
  lastVerifiedAt: string | null;
  distanceKm: number | null;
  mapsUrl: string;
  googleMapsUrl: string;
  appleMapsUrl: string;
  openingHoursNotes: string;
}

@Component({
  selector: 'app-emergency-vets-page',
  templateUrl: './emergency-vets-page.component.html',
  styleUrls: ['./emergency-vets-page.component.scss']
})
export class EmergencyVetsPageComponent implements OnInit {
  vets: EmergencyVetView[] = [];
  selectedVet: EmergencyVetView | null = null;
  suburbFilter = '';
  cityFilter = '';
  stateFilter = '';
  postcodeFilter = '';
  speciesFilter = '';
  afterHoursOnly = false;
  twentyFourHoursOnly = false;
  speciesOptions: string[] = [];
  latitude: number | null = null;
  longitude: number | null = null;
  radiusKm: number | null = 25;
  isLocating = false;
  isLoading = false;
  errorMessage = '';
  isDetailOpen = false;

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadSpecies();
    this.loadVets();
  }

  get filteredVets(): EmergencyVetView[] {
    return this.vets;
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.suburbFilter.trim() ||
      this.cityFilter.trim() ||
      this.stateFilter.trim() ||
      this.postcodeFilter.trim() ||
      this.speciesFilter.trim() ||
      this.afterHoursOnly ||
      this.twentyFourHoursOnly ||
      this.latitude !== null ||
      this.longitude !== null
    );
  }

  loadVets(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const params = new URLSearchParams();
    if (this.suburbFilter.trim()) params.set('suburb', this.suburbFilter.trim());
    if (this.cityFilter.trim()) params.set('city', this.cityFilter.trim());
    if (this.stateFilter.trim()) params.set('state', this.stateFilter.trim());
    if (this.postcodeFilter.trim()) params.set('postcode', this.postcodeFilter.trim());
    if (this.speciesFilter.trim()) params.set('species', this.speciesFilter.trim());
    if (this.afterHoursOnly) params.set('offersAfterHours', 'true');
    if (this.twentyFourHoursOnly) params.set('offers24HourService', 'true');
    if (this.latitude !== null && this.longitude !== null) {
      params.set('latitude', String(this.latitude));
      params.set('longitude', String(this.longitude));
      if (this.radiusKm !== null && this.radiusKm > 0) {
        params.set('radiusKm', String(this.radiusKm));
      }
    }

    const query = params.toString();
    this.apiService.get<EmergencyVetResponse>(`/emergency-vets${query ? `?${query}` : ''}`).subscribe({
      next: (response) => {
        const envelopeError = this.readEnvelopeError(response);
        if (envelopeError) {
          this.vets = [];
          this.errorMessage = envelopeError;
          this.isLoading = false;
          return;
        }

        this.vets = this.extractVets(response)
          .map((vet) => this.toViewModel(vet))
          .filter((vet) => !!vet.id || !!vet.clinicName);
        this.selectedVet = null;
        this.isLoading = false;
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'emergency.loadError';
        this.isLoading = false;
      }
    });
  }

  clearFilters(): void {
    this.suburbFilter = '';
    this.cityFilter = '';
    this.stateFilter = '';
    this.postcodeFilter = '';
    this.speciesFilter = '';
    this.afterHoursOnly = false;
    this.twentyFourHoursOnly = false;
    this.latitude = null;
    this.longitude = null;
    this.radiusKm = 25;
    this.loadVets();
  }

  clearLocation(): void {
    this.latitude = null;
    this.longitude = null;
    this.radiusKm = 25;
    this.loadVets();
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.errorMessage = 'Location is not available in this browser.';
      return;
    }

    this.errorMessage = '';
    this.isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.isLocating = false;
        this.loadVets();
      },
      () => {
        this.errorMessage = 'Unable to read your current location.';
        this.isLocating = false;
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  selectVet(vet: EmergencyVetView): void {
    this.selectedVet = vet;
    this.isDetailOpen = true;

    if (!vet.id) {
      return;
    }

    this.apiService.get<EmergencyVetDetailResponse>(`/emergency-vets/${vet.id}`).subscribe({
      next: (response) => {
        const detail = this.unwrapPayload<EmergencyVetWire | null>(response);
        if (detail) {
          this.selectedVet = this.toViewModel(detail);
        }
      },
      error: () => {
        // Keep the list-card data visible if the detail endpoint is temporarily unavailable.
      }
    });
  }

  closeDetails(): void {
    this.isDetailOpen = false;
  }

  websiteUrl(vet: EmergencyVetView): string {
    if (!vet.website) return '';
    return /^https?:\/\//i.test(vet.website) ? vet.website : `https://${vet.website}`;
  }

  emailUrl(vet: EmergencyVetView): string {
    return vet.email ? `mailto:${vet.email}` : '';
  }

  private loadSpecies(): void {
    this.apiService.get<SpeciesResponse>('/pet-species').subscribe({
      next: (response) => {
        this.speciesOptions = this.extractSpecies(response);
      },
      error: () => this.speciesOptions = []
    });
  }

  private extractVets(response: EmergencyVetResponse): EmergencyVetWire[] {
    const payload = this.unwrapPayload<EmergencyVetPayload>(response);
    if (Array.isArray(payload)) {
      return payload;
    }
    if (!payload) {
      return [];
    }
    return payload.items || payload.results || payload.emergencyVets || [];
  }

  private extractSpecies(response: SpeciesResponse): string[] {
    const payload = this.unwrapPayload<SpeciesPayload>(response);
    const rawItems = Array.isArray(payload)
      ? payload
      : payload?.items || payload?.results || payload?.species || [];

    return Array.from(new Set(rawItems
      .map((item) => typeof item === 'string' ? item : item.name || '')
      .map((item) => item.trim())
      .filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
  }

  private unwrapPayload<T>(response: ApiResponse<T> | T): T {
    if (this.isApiEnvelope<T>(response)) {
      return response.data;
    }
    return response;
  }

  private readEnvelopeError(response: EmergencyVetResponse): string {
    if (!this.isApiEnvelope<EmergencyVetPayload>(response) || response.success !== false) {
      return '';
    }
    return response.errors?.[0] || response.message || 'emergency.loadError';
  }

  private isApiEnvelope<T>(value: ApiResponse<T> | T): value is ApiResponse<T> {
    return typeof value === 'object' && value !== null && 'data' in value && 'success' in value;
  }

  private toViewModel(vet: EmergencyVetWire): EmergencyVetView {
    const suburb = vet.suburb || vet.city || '';
    const address = vet.fullAddress || [
      vet.addressLine1 || vet.streetAddress || vet.address,
      vet.addressLine2,
      suburb,
      vet.state,
      vet.postcode
    ].filter(Boolean).join(', ');
    const supportedSpecies = this.normalizeSpecies(vet);
    const googleMapsUrl = vet.googleMapsUrl || vet.mapsUrl || this.buildGoogleMapsUrl(vet, address);

    return {
      id: vet.id || vet.emergencyVetId || '',
      clinicName: vet.clinicName || vet.vetClinicName || vet.businessName || vet.name || 'Emergency vet clinic',
      address,
      suburb,
      state: vet.state || '',
      postcode: vet.postcode || '',
      phone: vet.phone || vet.phoneNumber || '',
      email: vet.email || '',
      website: vet.website || vet.websiteUrl || '',
      isAfterHours: !!(vet.offersAfterHours || vet.isAfterHours || vet.afterHours),
      is24Hours: !!(vet.offers24HourService || vet.is24Hours || vet.is24h || vet.open24Hours),
      description: vet.emergencyInstructions || vet.description || vet.notes || vet.instructions || '',
      supportedSpecies,
      isVerified: vet.isVerified === true,
      lastVerifiedAt: vet.lastVerifiedAt || null,
      distanceKm: typeof vet.distanceKm === 'number' ? vet.distanceKm : null,
      mapsUrl: vet.mapsUrl || googleMapsUrl,
      googleMapsUrl,
      appleMapsUrl: vet.appleMapsUrl || '',
      openingHoursNotes: vet.openingHoursNotes || ''
    };
  }

  private normalizeSpecies(vet: EmergencyVetWire): string[] {
    const source = vet.supportedSpecies?.length
      ? vet.supportedSpecies
      : vet.supportedSpeciesNames?.length
        ? vet.supportedSpeciesNames
        : Array.isArray(vet.species)
          ? vet.species
          : vet.species
            ? vet.species.split(',')
            : [];

    return source.map((item) => item.trim()).filter(Boolean);
  }

  private buildGoogleMapsUrl(vet: EmergencyVetWire, address: string): string {
    const query = vet.latitude != null && vet.longitude != null
      ? `${vet.latitude},${vet.longitude}`
      : address;
    return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
  }
}
