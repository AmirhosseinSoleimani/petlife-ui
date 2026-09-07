import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { AdminPet, PagedResult } from '../../../core/models/admin.models';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet, PetSpecies, PetTaxonomy } from '../../../core/models/customer-core.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

@Component({
  selector: 'app-admin-pets',
  templateUrl: './admin-pets.component.html',
  styleUrls: ['./admin-pets.component.scss']
})
export class AdminPetsComponent implements OnInit {
  pets: AdminPet[] = [];
  species: PetSpecies[] = [];
  selectedPet: Pet | null = null;
  search = '';
  speciesId = '';
  page = 1;
  totalPages = 0;
  totalCount = 0;
  isLoading = false;
  isDetailLoading = false;
  errorMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadTaxonomy();
    this.load();
  }

  get speciesOptions(): AppInputOption[] {
    return this.species.map((item) => ({ label: item.name, value: item.id }));
  }

  get dynamicEntries(): Array<{ key: string; value: string }> {
    if (!this.selectedPet?.dynamicValues) {
      return [];
    }
    return Object.entries(this.selectedPet.dynamicValues)
      .filter(([, value]) => !!value)
      .map(([key, value]) => ({ key, value: value || '' }));
  }

  loadTaxonomy(): void {
    this.apiService.get<ApiResponse<PetTaxonomy>>('/admin/pet-taxonomy').subscribe({
      next: (response) => {
        this.species = response.data?.species || [];
      }
    });
  }

  load(resetPage = false): void {
    if (resetPage) {
      this.page = 1;
    }
    this.isLoading = true;
    this.errorMessage = '';

    const params = new URLSearchParams();
    if (this.search.trim()) params.set('search', this.search.trim());
    if (this.speciesId) params.set('speciesId', this.speciesId);
    params.set('page', String(this.page));
    params.set('pageSize', '20');

    this.apiService.get<ApiResponse<PagedResult<AdminPet>>>(`/admin/pets?${params.toString()}`).subscribe({
      next: (response) => {
        this.pets = response.data?.items || [];
        this.totalPages = response.data?.totalPages || 0;
        this.totalCount = response.data?.totalCount || 0;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load pets.';
        this.isLoading = false;
      }
    });
  }

  viewPet(pet: AdminPet): void {
    this.selectedPet = null;
    this.isDetailLoading = true;
    this.apiService.get<ApiResponse<Pet>>(`/admin/pets/${pet.id}`).subscribe({
      next: (response) => {
        this.selectedPet = response.data || null;
        this.isDetailLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load pet details.';
        this.isDetailLoading = false;
      }
    });
  }

  closeDetail(): void {
    this.selectedPet = null;
    this.isDetailLoading = false;
  }

  previous(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.load();
    }
  }

  next(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
      this.load();
    }
  }
}
