import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet } from '../../../core/models/customer-core.models';
import { ProviderService, ServiceRequest, ServiceRequestPayload } from '../../../core/models/marketplace.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

@Component({
  selector: 'app-create-service-request',
  templateUrl: './create-service-request.component.html',
  styleUrls: ['./create-service-request.component.scss']
})
export class CreateServiceRequestComponent implements OnInit {
  pets: Pet[] = [];
  services: ProviderService[] = [];
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

  constructor(private readonly apiService: ApiService) {}

  get petOptions(): AppInputOption[] {
    return this.pets.map((pet) => ({
      label: pet.petName,
      value: pet.id
    }));
  }

  get serviceOptions(): AppInputOption[] {
    return this.services.map((service) => ({
      label: `${this.getServiceName(service)} - ${this.getProviderName(service)}`,
      value: service.id
    }));
  }

  ngOnInit(): void {
    this.loadFormData();
  }

  getServiceName(service: ProviderService): string {
    return service.name || service.serviceName || 'Provider service';
  }

  getProviderName(service: ProviderService): string {
    return service.provider?.businessName || service.provider?.name || 'Provider';
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
        this.errorMessage = 'Unable to load pets.';
        this.isLoading = false;
      }
    });
  }

  loadServices(): void {
    this.apiService.get<ApiResponse<ProviderService[]>>('/provider-services').subscribe({
      next: (response) => {
        this.services = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load provider services.';
        this.isLoading = false;
      }
    });
  }

  submitRequest(): void {
    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.post<ApiResponse<ServiceRequest>>('/service-requests', this.form).subscribe({
      next: () => {
        this.successMessage = 'Service request created successfully.';
        this.form = { petId: null, providerServiceId: null, requestMessage: '', requestedDate: '' };
        this.isSubmitting = false;
      },
      error: () => {
        this.errorMessage = 'Unable to create service request.';
        this.isSubmitting = false;
      }
    });
  }
}
