import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { GeographyArea, ServiceArea, ServiceAreaPayload } from '../../../core/models/marketplace.models';

const emptyAreaForm: ServiceAreaPayload = {
  geographyAreaId: null,
  isActive: true
};

@Component({
  selector: 'app-provider-service-areas',
  templateUrl: './provider-service-areas.component.html',
  styleUrls: ['./provider-service-areas.component.scss']
})
export class ProviderServiceAreasComponent implements OnInit {
  areas: ServiceArea[] = [];
  form: ServiceAreaPayload = { ...emptyAreaForm };
  selectedGeography: GeographyArea | null = null;
  isEditorOpen = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadAreas();
  }

  get selectedGeographyIds(): string[] {
    return this.areas
      .map((area) => area.geographyAreaId)
      .filter((id): id is string => !!id);
  }

  get canAddArea(): boolean {
    return !!this.form.geographyAreaId && !this.isSaving;
  }

  onGeographySelected(area: GeographyArea | null): void {
    this.selectedGeography = area;
    this.form.geographyAreaId = area?.id || null;
    this.errorMessage = '';
  }

  loadAreas(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<ServiceArea[]>>('/service-areas/me').subscribe({
      next: (response) => {
        this.areas = response.data || [];
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.readError(error, 'providerAreas.loadError');
        this.isLoading = false;
      }
    });
  }

  addArea(): void {
    if (!this.form.geographyAreaId) {
      this.errorMessage = 'providerAreas.managedRequired';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: ServiceAreaPayload = {
      geographyAreaId: this.form.geographyAreaId,
      isActive: !!this.form.isActive
    };

    this.apiService.post<ApiResponse<ServiceArea>>('/service-areas', payload).subscribe({
      next: () => {
        this.successMessage = 'providerAreas.addSuccess';
        this.resetEditor();
        this.isEditorOpen = false;
        this.loadAreas();
      },
      error: (error) => {
        this.errorMessage = this.readError(error, 'providerAreas.addError');
        this.isSaving = false;
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  deleteArea(area: ServiceArea): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.delete<ApiResponse<unknown>>(`/service-areas/${area.id}`).subscribe({
      next: () => {
        this.successMessage = 'providerAreas.removeSuccess';
        this.loadAreas();
      },
      error: (error) => {
        this.errorMessage = this.readError(error, 'providerAreas.removeError');
      }
    });
  }

  openEditor(): void {
    this.resetEditor();
    this.errorMessage = '';
    this.successMessage = '';
    this.isEditorOpen = true;
  }

  closeEditor(): void {
    if (this.isSaving) return;
    this.resetEditor();
    this.isEditorOpen = false;
  }

  areaDisplayName(area: ServiceArea): string {
    return [area.suburb, area.city, area.state, area.postcode]
      .filter(Boolean)
      .join(', ') || 'Managed service area';
  }

  private resetEditor(): void {
    this.form = { ...emptyAreaForm };
    this.selectedGeography = null;
  }

  private readError(error: { error?: { message?: string; errors?: string[] } } | null | undefined, fallback: string): string {
    return error?.error?.errors?.filter(Boolean).join(' ') || error?.error?.message || fallback;
  }
}
