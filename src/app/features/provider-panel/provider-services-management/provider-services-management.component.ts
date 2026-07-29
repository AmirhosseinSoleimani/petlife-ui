import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  PROVIDER_SERVICE_CATEGORY_OPTIONS,
  ProviderService,
  ProviderServicePayload
} from '../../../core/models/marketplace.models';

const emptyServiceForm: ProviderServicePayload = {
  serviceName: '',
  category: '',
  description: '',
  price: null,
  currency: 'AUD',
  durationMinutes: null,
  isActive: true
};

@Component({
  selector: 'app-provider-services-management',
  templateUrl: './provider-services-management.component.html',
  styleUrls: ['./provider-services-management.component.scss']
})
export class ProviderServicesManagementComponent implements OnInit {
  readonly categoryOptions = PROVIDER_SERVICE_CATEGORY_OPTIONS;
  services: ProviderService[] = [];
  form: ProviderServicePayload = { ...emptyServiceForm };
  editingId: string | null = null;
  isEditorOpen = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadServices();
  }

  get activeServicesCount(): number {
    return this.services.filter((service) => service.isActive !== false).length;
  }

  loadServices(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<ProviderService[]>>('/provider-services/me').subscribe({
      next: (response) => {
        this.services = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'providerServices.loadError';
        this.isLoading = false;
      }
    });
  }

  saveService(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.toPayload();
    const request = this.editingId
      ? this.apiService.put<ApiResponse<ProviderService>>(`/provider-services/${this.editingId}`, payload)
      : this.apiService.post<ApiResponse<ProviderService>>('/provider-services', payload);

    request.subscribe({
      next: () => {
        this.successMessage = this.editingId ? 'providerServices.updateSuccess' : 'providerServices.createSuccess';
        this.isEditorOpen = false;
        this.resetForm();
        this.loadServices();
      },
      error: () => {
        this.errorMessage = 'providerServices.saveError';
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  editService(service: ProviderService): void {
    this.editingId = service.id;
    this.form = {
      serviceName: service.serviceName || service.name || '',
      category: service.category || '',
      description: service.description || '',
      price: service.price ?? null,
      currency: service.currency || 'AUD',
      durationMinutes: service.durationMinutes ?? null,
      isActive: service.isActive !== false
    };
    this.errorMessage = '';
    this.successMessage = '';
    this.isEditorOpen = true;
  }

  openCreateService(): void {
    this.resetForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.isEditorOpen = true;
  }

  closeEditor(): void {
    if (this.isSaving) {
      return;
    }

    this.isEditorOpen = false;
    this.resetForm();
  }

  deleteService(service: ProviderService): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.delete<ApiResponse<unknown>>(`/provider-services/${service.id}`).subscribe({
      next: () => {
        this.successMessage = 'providerServices.deleteSuccess';
        this.loadServices();
      },
      error: () => {
        this.errorMessage = 'providerServices.deleteError';
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form = { ...emptyServiceForm };
  }

  getServiceName(service: ProviderService): string {
    return service.serviceName || service.name || '';
  }

  private toPayload(): ProviderServicePayload {
    return {
      ...this.form,
      price: this.form.price === null ? 0 : Number(this.form.price),
      durationMinutes: this.form.durationMinutes === null ? 0 : Number(this.form.durationMinutes),
      isActive: !!this.form.isActive
    };
  }
}
