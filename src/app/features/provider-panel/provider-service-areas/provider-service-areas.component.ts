import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { GeographyArea, ServiceArea, ServiceAreaPayload } from '../../../core/models/marketplace.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

const emptyAreaForm: ServiceAreaPayload = {
  geographyAreaId: null,
  suburb: '',
  state: '',
  postcode: '',
  radiusKm: 10,
  isActive: true
};

@Component({
  selector: 'app-provider-service-areas',
  templateUrl: './provider-service-areas.component.html',
  styleUrls: ['./provider-service-areas.component.scss']
})
export class ProviderServiceAreasComponent implements OnInit {
  areas: ServiceArea[] = [];
  geographies: GeographyArea[] = [];
  form: ServiceAreaPayload = { ...emptyAreaForm };
  isEditorOpen = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadGeographies();
    this.loadAreas();
  }

  get geographyOptions(): AppInputOption[] {
    return this.geographies.map((area) => ({
      label: `${area.suburb} — ${area.postcode} — ${area.city}`,
      value: area.id
    }));
  }

  loadGeographies(): void {
    this.apiService.get<ApiResponse<GeographyArea[]>>('/geography').subscribe({
      next: (response) => this.geographies = response.data || [],
      error: () => this.geographies = []
    });
  }

  selectGeography(areaId: string | null): void {
    this.form.geographyAreaId = areaId || null;
    const area = this.geographies.find((item) => item.id === areaId);
    if (!area) return;
    this.form.suburb = area.suburb;
    this.form.state = area.state;
    this.form.postcode = area.postcode;
  }

  loadAreas(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<ServiceArea[]>>('/service-areas/me').subscribe({
      next: (response) => {
        this.areas = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'providerAreas.loadError';
        this.isLoading = false;
      }
    });
  }

  addArea(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.post<ApiResponse<ServiceArea>>('/service-areas', this.toPayload()).subscribe({
      next: () => {
        this.successMessage = 'providerAreas.addSuccess';
        this.form = { ...emptyAreaForm };
        this.isEditorOpen = false;
        this.loadGeographies();
    this.loadAreas();
      },
      error: () => {
        this.errorMessage = 'providerAreas.addError';
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
        this.loadGeographies();
    this.loadAreas();
      },
      error: () => {
        this.errorMessage = 'providerAreas.removeError';
      }
    });
  }

  openEditor(): void {
    this.form = { ...emptyAreaForm };
    this.errorMessage = '';
    this.successMessage = '';
    this.isEditorOpen = true;
  }

  closeEditor(): void {
    if (this.isSaving) {
      return;
    }

    this.form = { ...emptyAreaForm };
    this.isEditorOpen = false;
  }

  private toPayload(): ServiceAreaPayload {
    return {
      ...this.form,
      radiusKm: this.form.radiusKm === null ? 0 : Number(this.form.radiusKm),
      isActive: !!this.form.isActive
    };
  }
}
