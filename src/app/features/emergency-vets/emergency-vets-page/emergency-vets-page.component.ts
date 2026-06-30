import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { EmergencyVet } from '../../../core/models/customer-core.models';

@Component({
  selector: 'app-emergency-vets-page',
  templateUrl: './emergency-vets-page.component.html',
  styleUrls: ['./emergency-vets-page.component.scss']
})
export class EmergencyVetsPageComponent implements OnInit {
  vets: EmergencyVet[] = [];
  selectedVet: EmergencyVet | null = null;
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

  get filteredVets(): EmergencyVet[] {
    return this.vets.filter((vet) => {
      const suburbMatch = !this.suburbFilter || (vet.suburb || '').toLowerCase().includes(this.suburbFilter.toLowerCase());
      const stateMatch = !this.stateFilter || (vet.state || '').toLowerCase().includes(this.stateFilter.toLowerCase());
      const afterHoursMatch = !this.afterHoursOnly || !!vet.afterHours;
      const twentyFourHoursMatch = !this.twentyFourHoursOnly || !!vet.is24Hours;
      return suburbMatch && stateMatch && afterHoursMatch && twentyFourHoursMatch;
    });
  }

  loadVets(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<EmergencyVet[]>>('/emergency-vets').subscribe({
      next: (response) => {
        this.vets = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load emergency vets.';
        this.isLoading = false;
      }
    });
  }

  selectVet(vet: EmergencyVet): void {
    this.apiService.get<ApiResponse<EmergencyVet>>(`/emergency-vets/${vet.id}`).subscribe({
      next: (response) => {
        this.selectedVet = response.data;
      },
      error: () => {
        this.selectedVet = vet;
      }
    });
  }
}
