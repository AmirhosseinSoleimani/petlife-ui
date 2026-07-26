import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet } from '../../../core/models/customer-core.models';
import { Provider, ProviderService, ServiceRequest, ServiceRequestPayload } from '../../../core/models/marketplace.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

@Component({
  selector: 'app-create-service-request',
  templateUrl: './create-service-request.component.html',
  styleUrls: ['./create-service-request.component.scss']
})
export class CreateServiceRequestComponent implements OnInit {
  pets: Pet[] = [];
  services: ProviderService[] = [];
  providerNameById: Record<string, string> = {};
  form: ServiceRequestPayload = {
    petId: null,
    providerServiceId: null,
    requestMessage: '',
    requestedDate: ''
  };
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly i18nService: I18nService,
    private readonly route: ActivatedRoute
  ) {}

  get petOptions(): AppInputOption[] {
    return this.pets.map((pet) => ({
      label: pet.petName,
      value: pet.id
    }));
  }

  get serviceOptions(): AppInputOption[] {
    return this.services.map((service) => ({
      label: `${this.getServiceName(service)} - ${this.getProviderName(service) || this.i18nService.translate('services.providerUnavailable')}`,
      value: service.id
    }));
  }

  get selectedPet(): Pet | null {
    return this.pets.find((pet) => pet.id === this.form.petId) || null;
  }

  get selectedService(): ProviderService | null {
    return this.services.find((service) => service.id === this.form.providerServiceId) || null;
  }

  ngOnInit(): void {
    this.loadFormData();
  }

  getServiceName(service: ProviderService): string {
    return service.name || service.serviceName || this.i18nService.translate('services.serviceFallback');
  }

  getProviderName(service: ProviderService): string {
    return service.providerBusinessName
      || service.businessName
      || service.providerName
      || service.provider?.businessName
      || service.provider?.name
      || this.lookupProviderName(service)
      || '';
  }

  loadFormData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: (response) => {
        this.pets = response.data || [];
        this.loadServices();
      },
      error: () => {
        this.errorMessage = 'requestForm.loadPetsError';
        this.isLoading = false;
      }
    });
  }

  loadServices(): void {
    this.apiService.get<ApiResponse<ProviderService[]>>('/provider-services').subscribe({
      next: (response) => {
        this.services = response.data || [];
        const requestedServiceId = this.route.snapshot.queryParamMap.get('serviceId');
        if (requestedServiceId && this.services.some((service) => service.id === requestedServiceId)) {
          this.form.providerServiceId = requestedServiceId;
        }
        this.loadProviders();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'requestForm.loadServicesError';
        this.isLoading = false;
      }
    });
  }

  private loadProviders(): void {
    this.apiService.get<ApiResponse<Provider[]>>('/providers').subscribe({
      next: (response) => {
        this.providerNameById = (response.data || []).reduce<Record<string, string>>((map, provider) => {
          const providerName = provider.businessName || provider.name || '';
          const providerIds = this.getProviderIds(provider);

          if (providerName) {
            providerIds.forEach((id) => map[id] = providerName);
          }

          return map;
        }, {});
      }
    });
  }

  private lookupProviderName(service: ProviderService): string {
    const matchedId = this.getServiceProviderIds(service).find((id) => this.providerNameById[id]);
    return matchedId ? this.providerNameById[matchedId] : '';
  }

  private getServiceProviderIds(service: ProviderService): string[] {
    return [
      service.providerId,
      service.providerProfileId,
      service.providerUserId,
      service.provider?.id,
      service.provider?.providerId,
      service.provider?.providerProfileId,
      service.provider?.userId
    ].filter((id): id is string => !!id);
  }

  private getProviderIds(provider: Provider): string[] {
    return [
      provider.id,
      provider.providerId,
      provider.providerProfileId,
      provider.userId
    ].filter((id): id is string => !!id);
  }

  submitRequest(): void {
    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.post<ApiResponse<ServiceRequest>>('/service-requests', this.form).subscribe({
      next: () => {
        this.successMessage = 'requestForm.success';
        this.form = { petId: null, providerServiceId: null, requestMessage: '', requestedDate: '' };
        this.isSubmitting = false;
      },
      error: () => {
        this.errorMessage = 'requestForm.submitError';
        this.isSubmitting = false;
      }
    });
  }
}
