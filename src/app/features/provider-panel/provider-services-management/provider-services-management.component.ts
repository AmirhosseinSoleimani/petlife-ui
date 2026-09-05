import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  DeliveryMode,
  Provider,
  ProviderService,
  ProviderServicePayload,
  ProviderServiceAvailabilityWindow,
  ServiceDefinition
} from '../../../core/models/marketplace.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

const emptyServiceForm: ProviderServicePayload = {
  serviceDefinitionId: null,
  serviceName: '',
  category: '',
  description: '',
  price: null,
  priceMax: null,
  pricingType: 'Fixed',
  pricingNotes: '',
  specialConditions: '',
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
  readonly pricingTypeOptions: AppInputOption[] = [
    { label: 'Fixed price', value: 'Fixed' },
    { label: 'From price', value: 'From' },
    { label: 'Quote required', value: 'Quote' }
  ];
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
  availabilityWindows: ProviderServiceAvailabilityWindow[] = [];
  isTemporarilyClosed = false;
  temporaryClosedUntil = '';

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
      next: (response) => {
        const serviceId = response.data?.id || this.editingId;
        if (!serviceId) { this.errorMessage = 'The service was saved but its identifier was not returned.'; this.isSaving = false; return; }
        this.saveAvailability(serviceId, () => {
          this.successMessage = this.editingId ? 'Service and availability updated.' : 'Service and availability created.';
          this.isEditorOpen = false;
          this.resetForm();
          this.loadServices();
        });
      },
      error: (error) => {
        this.errorMessage = error?.error?.errors?.join(' ') || error?.error?.message || 'providerServices.saveError';
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
      priceMax: service.priceMax ?? null,
      pricingType: service.pricingType || 'Fixed',
      pricingNotes: service.pricingNotes || '',
      specialConditions: service.specialConditions || '',
      currency: service.currency || 'AUD',
      durationMinutes: service.durationMinutes ?? null,
      deliveryMode: service.deliveryMode || 'AtProviderLocation',
      isActive: service.isActive !== false
    };
    this.availabilityWindows = (service.availabilityWindows || []).map(window => ({ ...window, startTime: (window.startTime || '').slice(0, 5), endTime: (window.endTime || '').slice(0, 5) }));
    this.isTemporarilyClosed = !!service.isTemporarilyClosed;
    this.temporaryClosedUntil = service.temporaryClosedUntil ? this.toDateTimeLocal(service.temporaryClosedUntil) : '';
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
    this.availabilityWindows = [];
    this.isTemporarilyClosed = false;
    this.temporaryClosedUntil = '';
  }

  addAvailabilityWindow(): void {
    this.availabilityWindows = [...this.availabilityWindows, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', capacity: null }];
  }

  removeAvailabilityWindow(index: number): void {
    this.availabilityWindows = this.availabilityWindows.filter((_, i) => i !== index);
  }

  dayLabel(day: number): string { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day] || 'Day'; }

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

  private saveAvailability(serviceId: string, done: () => void): void {
    const temporaryClosedUntil = this.isTemporarilyClosed && this.temporaryClosedUntil ? new Date(this.temporaryClosedUntil).toISOString() : null;
    const windows = this.availabilityWindows.map(window => ({ dayOfWeek: Number(window.dayOfWeek), startTime: window.startTime, endTime: window.endTime, capacity: window.capacity == null ? null : Number(window.capacity) }));
    this.apiService.put<ApiResponse<ProviderService>>(`/provider-services/${serviceId}/availability`, { isTemporarilyClosed: this.isTemporarilyClosed, temporaryClosedUntil, windows }).subscribe({
      next: () => done(),
      error: error => { this.errorMessage = error?.error?.errors?.join(' ') || error?.error?.message || 'Service saved, but availability could not be saved.'; this.isSaving = false; },
      complete: () => this.isSaving = false
    });
  }

  private toDateTimeLocal(value: string): string {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private toPayload(): ProviderServicePayload {
    return {
      ...this.form,
      category: this.selectedDefinition?.categoryName || '',
      price: this.form.pricingType === 'Quote' ? 0 : (this.form.price === null ? 0 : Number(this.form.price)),
      priceMax: this.form.priceMax === null || this.form.priceMax === undefined ? null : Number(this.form.priceMax),
      pricingType: this.form.pricingType || 'Fixed',
      pricingNotes: this.form.pricingNotes?.trim() || '',
      specialConditions: this.form.specialConditions?.trim() || '',
      durationMinutes: this.form.durationMinutes === null ? 0 : Number(this.form.durationMinutes),
      isActive: !!this.form.isActive
    };
  }

}
