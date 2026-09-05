import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { EmergencyVet } from '../../../core/models/customer-core.models';

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
  openNowOnly = false;
  latitude: number | null = null;
  longitude: number | null = null;
  radiusKm: number | null = 25;
  isLocating = false;
  isLoading = false;
  errorMessage = '';
  isDetailOpen = false;

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadVets();
  }

  get filteredVets(): EmergencyVetView[] {
    return this.vets;
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
    if (this.openNowOnly) params.set('isOpenNow', 'true');
    if (this.latitude !== null && this.longitude !== null) {
      params.set('latitude', String(this.latitude));
      params.set('longitude', String(this.longitude));
      if (this.radiusKm !== null) params.set('radiusKm', String(this.radiusKm));
    }

    this.apiService.get<ApiResponse<EmergencyVet[]>>(`/emergency-vets?${params.toString()}`).subscribe({
      next: (response) => {
        this.vets = (response.data || []).map((vet) => this.toViewModel(vet));
        this.selectedVet = null;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'emergency.loadError';
        this.isLoading = false;
      }
    });
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.errorMessage = 'Location is not available in this browser.';
      return;
    }

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
    this.apiService.get<ApiResponse<EmergencyVet>>(`/emergency-vets/${vet.id}`).subscribe({
      next: (response) => {
        this.selectedVet = response.data ? this.toViewModel(response.data) : vet;
        this.isDetailOpen = true;
      },
      error: () => {
        this.selectedVet = vet;
        this.isDetailOpen = true;
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

  private toViewModel(vet: EmergencyVet): EmergencyVetView {
    return {
      id: vet.id,
      clinicName: vet.clinicName || vet.vetClinicName || vet.businessName || vet.name || '',
      address: [vet.addressLine1 || vet.address, vet.addressLine2, vet.suburb, vet.state, vet.postcode].filter(Boolean).join(', '),
      suburb: vet.suburb || '',
      state: vet.state || '',
      postcode: vet.postcode || '',
      phone: vet.phone || vet.phoneNumber || '',
      email: vet.email || '',
      website: vet.website || vet.websiteUrl || '',
      isAfterHours: !!(vet.offersAfterHours || vet.isAfterHours || vet.afterHours),
      is24Hours: !!(vet.offers24HourService || vet.is24Hours || vet.is24h || vet.open24Hours),
      description: vet.emergencyInstructions || vet.description || vet.notes || vet.instructions || '',
      supportedSpecies: vet.supportedSpecies || [],
      isVerified: vet.isVerified !== false,
      lastVerifiedAt: vet.lastVerifiedAt || null,
      distanceKm: vet.distanceKm ?? null,
      mapsUrl: vet.mapsUrl || '',
      googleMapsUrl: vet.googleMapsUrl || vet.mapsUrl || '',
      appleMapsUrl: vet.appleMapsUrl || '',
      openingHoursNotes: vet.openingHoursNotes || ''
    };
  }
}
