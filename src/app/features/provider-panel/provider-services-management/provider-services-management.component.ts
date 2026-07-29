import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  DeliveryMode,
  Provider,
  ProviderService,
  ProviderServicePayload,
  ServiceDefinition
} from '../../../core/models/marketplace.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

const emptyServiceForm: ProviderServicePayload = {
  serviceDefinitionId: null,
  serviceName: '',
  category: '',
  description: '',
  price: null,
  currency: 'AUD',
  durationMinutes: null,
  deliveryMode: 'AtProviderLocation',
  isActive: false
};

@Component({
  selector: 'app-provider-services-management',
  templateUrl: './provider-services-management.component.html',
  styleUrls: ['./provider-services-management.component.scss']
})
export class ProviderServicesManagementComponent implements OnInit {
  readonly deliveryModeOptions: AppInputOption[] = [
    { label: 'deliveryMode.atProvider', value: 'AtProviderLocation' },
    { label: 'deliveryMode.atCustomer', value: 'AtCustomerLocation' },
    { label: 'deliveryMode.online', value: 'Online' },
    { label: 'deliveryMode.hybrid', value: 'Hybrid' }
  ];
  services: ProviderService[] = [];
  serviceDefinitions: ServiceDefinition[] = [];
  profile: Provider | null = null;
  form: ProviderServicePayload = { ...emptyServiceForm };
  editingId: string | null = null;
  isEditorOpen = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadSetupData();
    this.loadServices();
  }

  get definitionOptions(): AppInputOption[] {
    return this.serviceDefinitions.map((definition) => ({
      label: `${definition.name} — ${definition.categoryName}`,
      value: definition.id
    }));
  }

  get selectedDefinition(): ServiceDefinition | null {
    return this.serviceDefinitions.find((item) => item.id === this.form.serviceDefinitionId) || null;
  }

  get isProfileReady(): boolean {
    return this.profile?.isSetupComplete === true;
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

  loadSetupData(): void {
    this.apiService.get<ApiResponse<ServiceDefinition[]>>('/service-definitions').subscribe({
      next: (response) => this.serviceDefinitions = response.data || [],
      error: () => this.errorMessage = 'providerServices.loadDefinitionsError'
    });
    this.apiService.get<ApiResponse<Provider>>('/providers/me').subscribe({
      next: (response) => this.profile = response.data || null
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
      serviceDefinitionId: service.serviceDefinitionId || null,
      serviceName: service.serviceName || service.name || '',
      category: service.serviceCategoryName || service.category || '',
      description: service.description || '',
      price: service.price ?? null,
      currency: service.currency || 'AUD',
      durationMinutes: service.durationMinutes ?? null,
      deliveryMode: service.deliveryMode || 'AtProviderLocation',
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

  getDeliveryModeKey(deliveryMode: DeliveryMode | undefined): string {
    switch (deliveryMode) {
      case 'AtCustomerLocation': return 'deliveryMode.atCustomer';
      case 'Online': return 'deliveryMode.online';
      case 'Hybrid': return 'deliveryMode.hybrid';
      default: return 'deliveryMode.atProvider';
    }
  }

  private toPayload(): ProviderServicePayload {
    return {
      ...this.form,
      category: this.selectedDefinition?.categoryName || '',
      price: this.form.price === null ? 0 : Number(this.form.price),
      durationMinutes: this.form.durationMinutes === null ? 0 : Number(this.form.durationMinutes),
      isActive: !!this.form.isActive
    };
  }
}
