import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet } from '../../../core/models/customer-core.models';
import {
  DeliveryMode,
  ProviderService,
  ServiceRequest,
  ServiceRequestPayload
} from '../../../core/models/marketplace.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

@Component({
  selector: 'app-create-service-request',
  templateUrl: './create-service-request.component.html',
  styleUrls: ['./create-service-request.component.scss']
})
export class CreateServiceRequestComponent implements OnInit {
  pets: Pet[] = [];
  selectedService: ProviderService | null = null;
  form: ServiceRequestPayload = {
    petId: null,
    providerServiceId: null,
    requestMessage: '',
    requestedDate: '',
    serviceAddressLine1: '',
    serviceSuburb: '',
    serviceState: '',
    servicePostcode: ''
  };
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly i18nService: I18nService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const serviceId = this.route.snapshot.paramMap.get('serviceId');
    if (!serviceId) {
      this.router.navigate(['/services']);
      return;
    }

    this.form.providerServiceId = serviceId;
    this.loadContext(serviceId);
  }

  get petOptions(): AppInputOption[] {
    return this.pets.map((pet) => ({
      label: `${pet.petName}${pet.species ? ` — ${pet.species}` : ''}`,
      value: pet.id
    }));
  }

  get selectedPet(): Pet | null {
    return this.pets.find((pet) => pet.id === this.form.petId) || null;
  }

  get needsCustomerLocation(): boolean {
    return this.selectedService?.deliveryMode === 'AtCustomerLocation'
      || this.selectedService?.deliveryMode === 'Hybrid';
  }

  get isSelectedPetCompatible(): boolean {
    if (!this.selectedPet || !this.selectedService) {
      return true;
    }

    return (this.selectedService.applicableSpecies || []).some(
      (species) => species.toLowerCase() === (this.selectedPet?.species || '').toLowerCase());
  }

  get providerLocation(): string {
    if (!this.selectedService) {
      return '';
    }

    return [
      this.selectedService.providerAddressLine1,
      this.selectedService.providerSuburb,
      this.selectedService.providerState,
      this.selectedService.providerPostcode
    ].filter(Boolean).join(', ');
  }

  getServiceName(): string {
    return this.selectedService?.serviceName
      || this.selectedService?.name
      || this.i18nService.translate('services.serviceFallback');
  }

  getProviderName(): string {
    return this.selectedService?.providerBusinessName
      || this.selectedService?.businessName
      || this.selectedService?.providerName
      || '';
  }

  getDeliveryModeKey(deliveryMode: DeliveryMode | undefined): string {
    switch (deliveryMode) {
      case 'AtCustomerLocation': return 'deliveryMode.atCustomer';
      case 'Online': return 'deliveryMode.online';
      case 'Hybrid': return 'deliveryMode.hybrid';
      default: return 'deliveryMode.atProvider';
    }
  }

  loadContext(serviceId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      pets: this.apiService.get<ApiResponse<Pet[]>>('/pets'),
      service: this.apiService.get<ApiResponse<ProviderService>>(`/provider-services/${serviceId}`)
    }).subscribe({
      next: ({ pets, service }) => {
        this.pets = pets.data || [];
        this.selectedService = service.data || null;
        const requestedPetId = this.route.snapshot.queryParamMap.get('petId');
        if (requestedPetId && this.pets.some((pet) => pet.id === requestedPetId)) {
          this.form.petId = requestedPetId;
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'requestForm.contextError';
        this.isLoading = false;
      }
    });
  }

  submitRequest(): void {
    if (!this.isSelectedPetCompatible) {
      this.errorMessage = 'requestForm.incompatiblePet';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: ServiceRequestPayload = {
      ...this.form,
      serviceAddressLine1: this.needsCustomerLocation ? this.form.serviceAddressLine1 : undefined,
      serviceSuburb: this.needsCustomerLocation ? this.form.serviceSuburb : undefined,
      serviceState: this.needsCustomerLocation ? this.form.serviceState : undefined,
      servicePostcode: this.needsCustomerLocation ? this.form.servicePostcode : undefined
    };

    this.apiService.post<ApiResponse<ServiceRequest>>('/service-requests', payload).subscribe({
      next: () => this.router.navigate(['/service-requests/my']),
      error: () => {
        this.errorMessage = 'requestForm.compatibilityError';
        this.isSubmitting = false;
      }
    });
  }
}
