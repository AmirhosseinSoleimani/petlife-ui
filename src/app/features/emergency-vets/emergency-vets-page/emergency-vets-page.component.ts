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
  phone: string;
  email: string;
  website: string;
  isAfterHours: boolean;
  is24Hours: boolean;
  description: string;
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
  stateFilter = '';
  afterHoursOnly = false;
  twentyFourHoursOnly = false;
  isLoading = false;
  errorMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadVets();
  }

  get filteredVets(): EmergencyVetView[] {
    const suburbFilter = this.suburbFilter.trim().toLowerCase();
    const stateFilter = this.stateFilter.trim().toLowerCase();

    return this.vets.filter((vet) => {
      const suburbMatch = !suburbFilter ||
        vet.suburb.toLowerCase().includes(suburbFilter) ||
        vet.address.toLowerCase().includes(suburbFilter);
      const stateMatch = !stateFilter || vet.state.toLowerCase().includes(stateFilter);
      const afterHoursMatch = !this.afterHoursOnly || vet.isAfterHours;
      const twentyFourHoursMatch = !this.twentyFourHoursOnly || vet.is24Hours;
      return suburbMatch && stateMatch && afterHoursMatch && twentyFourHoursMatch;
    });
  }

  loadVets(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<EmergencyVet[]>>('/emergency-vets').subscribe({
      next: (response) => {
        this.vets = (response.data || []).map((vet) => this.toViewModel(vet));
        this.selectedVet = null;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load emergency vets.';
        this.isLoading = false;
      }
    });
  }

  selectVet(vet: EmergencyVetView): void {
    this.apiService.get<ApiResponse<EmergencyVet>>(`/emergency-vets/${vet.id}`).subscribe({
      next: (response) => {
        this.selectedVet = response.data ? this.toViewModel(response.data) : vet;
      },
      error: () => {
        this.selectedVet = vet;
      }
    });
  }

  websiteUrl(vet: EmergencyVetView): string {
    if (!vet.website) {
      return '';
    }

    return /^https?:\/\//i.test(vet.website) ? vet.website : `https://${vet.website}`;
  }

  private toViewModel(vet: EmergencyVet): EmergencyVetView {
    return {
      id: vet.id,
      clinicName: vet.clinicName || vet.vetClinicName || vet.businessName || vet.name || '',
      address: vet.address || '',
      suburb: vet.suburb || '',
      state: vet.state || '',
      phone: vet.phone || vet.phoneNumber || '',
      email: vet.email || '',
      website: vet.website || '',
      isAfterHours: !!(vet.isAfterHours || vet.afterHours),
      is24Hours: !!(vet.is24Hours || vet.is24h || vet.open24Hours),
      description: vet.description || vet.notes || vet.instructions || ''
    };
  }
}
