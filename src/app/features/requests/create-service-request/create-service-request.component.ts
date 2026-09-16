import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet } from '../../../core/models/customer-core.models';
import {
  DeliveryMode,
  GeographyArea,
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
    serviceGeographyAreaId: null,
    consentSharePetProfile: false,
    consentShareHealthSummary: false,
    consentShareContactDetails: false
  };
  selectedServiceGeography: GeographyArea | null = null;
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

  get isConsentValid(): boolean {
    return !this.form.consentShareHealthSummary || this.form.consentSharePetProfile;
  }

  get isLocationValid(): boolean {
    if (!this.needsCustomerLocation) return true;
    return !!this.form.serviceAddressLine1?.trim() && !!this.form.serviceGeographyAreaId;
  }

  get minRequestedDate(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }

  onHealthConsentChanged(): void {
    if (this.form.consentShareHealthSummary) this.form.consentSharePetProfile = true;
  }

  onPetProfileConsentChanged(): void {
    if (!this.form.consentSharePetProfile) this.form.consentShareHealthSummary = false;
  }

  onServiceGeographySelected(area: GeographyArea | null): void {
    this.selectedServiceGeography = area;
    this.form.serviceGeographyAreaId = area?.id || null;
    this.errorMessage = '';
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
    if (!this.isConsentValid) {
      this.errorMessage = 'requestForm.healthConsentRequiresPet';
      return;
    }
    if (!this.isLocationValid) {
      this.errorMessage = 'requestForm.managedGeographyRequired';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: ServiceRequestPayload = {
      petId: this.form.petId,
      providerServiceId: this.form.providerServiceId,
      requestMessage: this.form.requestMessage?.trim() || '',
      requestedDate: this.form.requestedDate,
      serviceAddressLine1: this.needsCustomerLocation ? this.form.serviceAddressLine1?.trim() : undefined,
      serviceGeographyAreaId: this.needsCustomerLocation ? this.form.serviceGeographyAreaId : undefined,
      consentSharePetProfile: !!this.form.consentSharePetProfile,
      consentShareHealthSummary: !!this.form.consentShareHealthSummary,
      consentShareContactDetails: !!this.form.consentShareContactDetails
    };

    this.apiService.post<ApiResponse<ServiceRequest>>('/service-requests', payload).subscribe({
      next: () => this.router.navigate(['/service-requests/my']),
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'requestForm.compatibilityError';
        this.isSubmitting = false;
      }
    });
  }
}
