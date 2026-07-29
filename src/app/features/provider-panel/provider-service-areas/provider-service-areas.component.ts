import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ServiceArea, ServiceAreaPayload } from '../../../core/models/marketplace.models';

const emptyAreaForm: ServiceAreaPayload = {
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
  form: ServiceAreaPayload = { ...emptyAreaForm };
  isEditorOpen = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadAreas();
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
