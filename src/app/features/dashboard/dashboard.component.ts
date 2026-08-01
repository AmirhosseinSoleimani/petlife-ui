import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ApiResponse } from '../../core/models/api-response.model';
import { HealthRecord, Pet, Reminder } from '../../core/models/customer-core.models';
import { Provider, ProviderService, ServiceArea, ServiceRequest } from '../../core/models/marketplace.models';
import {
  CUSTOMER_QUICK_ACTIONS,
  PROVIDER_QUICK_ACTIONS,
  QuickActionDefinition
} from '../../core/preferences/user-preferences.models';
import { UserPreferencesService } from '../../core/preferences/user-preferences.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly currentUser = this.authService.getCurrentUser();
  pets: Pet[] = [];
  reminders: Reminder[] = [];
  healthRecords: HealthRecord[] = [];
  requests: ServiceRequest[] = [];
  providerProfile: Provider | null = null;
  providerServices: ProviderService[] = [];
  serviceAreas: ServiceArea[] = [];
  providerRequests: ServiceRequest[] = [];
  isLoadingPets = false;
  isLoadingReminders = false;
  isLoadingHealth = false;
  isLoadingRequests = false;
  petsLoadFailed = false;
  remindersLoadFailed = false;
  healthLoadFailed = false;
  requestsLoadFailed = false;
  isLoadingProviderProfile = false;
  isLoadingProviderServices = false;
  isLoadingServiceAreas = false;
  isLoadingProviderRequests = false;
  providerProfileLoadFailed = false;
  providerServicesLoadFailed = false;
  serviceAreasLoadFailed = false;
  providerRequestsLoadFailed = false;
  visibleQuickActions: QuickActionDefinition[] = [];
  private preferencesSubscription?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly apiService: ApiService,
    private readonly preferencesService: UserPreferencesService
  ) {}

  ngOnInit(): void {
    this.preferencesSubscription = this.preferencesService.preferences$.subscribe((preferences) => {
      const definitions = this.isProvider ? PROVIDER_QUICK_ACTIONS : CUSTOMER_QUICK_ACTIONS;
      const selected = new Set(preferences.quickActions);
      this.visibleQuickActions = definitions.filter((action) => selected.has(action.key));
    });
    this.preferencesService.load().subscribe();

    if (this.isProvider) {
      this.loadProviderDashboard();
      return;
    }

    this.loadPets();
    this.loadReminders();
    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.preferencesSubscription?.unsubscribe();
  }

  get isProvider(): boolean {
    return (this.currentUser?.role || '').toLowerCase().includes('provider');
  }

  get displayName(): string {
    const name = this.currentUser?.name || '';
    return name.includes('@') ? name.split('@')[0] : name;
  }

  get providerBusinessName(): string {
    return this.providerProfile?.businessName || '';
  }

  get publishedServices(): ProviderService[] {
    return this.providerServices.filter((service) => service.isActive !== false);
  }

  get newProviderRequests(): ServiceRequest[] {
    return this.providerRequests.filter((request) => this.providerRequestStatus(request) === 'requested');
  }

  get acceptedProviderRequests(): ServiceRequest[] {
    return this.providerRequests.filter((request) => this.providerRequestStatus(request) === 'accepted');
  }

  get completedProviderRequests(): ServiceRequest[] {
    return this.providerRequests.filter((request) => this.providerRequestStatus(request) === 'completed');
  }

  get latestProviderRequests(): ServiceRequest[] {
    return [...this.providerRequests]
      .sort((a, b) => this.dateValue(b.requestedDate || b.createdAt) - this.dateValue(a.requestedDate || a.createdAt))
      .slice(0, 4);
  }

  get providerProfileChecklist(): Array<{ label: string; complete: boolean }> {
    return [
      { label: 'dashboard.businessProfile', complete: !!this.providerProfile?.id },
      {
        label: 'dashboard.contactDetails',
        complete: !!(this.providerProfile?.email || this.providerProfile?.phoneNumber || this.providerProfile?.phone)
      },
      { label: 'dashboard.servicesReady', complete: this.providerServices.length > 0 },
      { label: 'dashboard.coverageReady', complete: this.serviceAreas.length > 0 }
    ];
  }

  get providerReadiness(): number {
    const completed = this.providerProfileChecklist.filter((item) => item.complete).length;
    return Math.round((completed / this.providerProfileChecklist.length) * 100);
  }

  get providerDashboardLoading(): boolean {
    return this.isLoadingProviderProfile
      || this.isLoadingProviderServices
      || this.isLoadingServiceAreas
      || this.isLoadingProviderRequests;
  }

  get upcomingCare(): Reminder[] {
    return [...this.reminders]
      .sort((a, b) => this.dateValue(a.dueDate, Number.MAX_SAFE_INTEGER) - this.dateValue(b.dueDate, Number.MAX_SAFE_INTEGER))
      .slice(0, 4);
  }

  get recentHealthRecords(): HealthRecord[] {
    return [...this.healthRecords]
      .sort((a, b) => this.dateValue(b.recordDate) - this.dateValue(a.recordDate))
      .slice(0, 3);
  }

  get activeRequests(): ServiceRequest[] {
    return this.requests.filter((request) => {
      const status = (request.status || 'Requested').toLowerCase();
      return status !== 'completed' && status !== 'rejected';
    });
  }

  get recentRequests(): ServiceRequest[] {
    return [...this.requests]
      .sort((a, b) => this.dateValue(b.requestedDate || b.createdAt) - this.dateValue(a.requestedDate || a.createdAt))
      .slice(0, 3);
  }

  getPetName(petId: string | undefined): string {
    return this.pets.find((pet) => pet.id === petId)?.petName || '';
  }

  getRequestPetName(request: ServiceRequest): string {
    return request.pet?.petName || request.pet?.name || request.petName || this.getPetName(request.petId);
  }

  getRequestServiceName(request: ServiceRequest): string {
    return request.providerServiceName
      || request.providerService?.serviceName
      || request.providerService?.name
      || request.serviceName
      || '';
  }

  getRequestTone(request: ServiceRequest): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
    switch ((request.status || 'Requested').toLowerCase()) {
      case 'accepted': return 'success';
      case 'rejected': return 'danger';
      case 'completed': return 'info';
      case 'requested': return 'warning';
      default: return 'neutral';
    }
  }

  getProviderRequestService(request: ServiceRequest): string {
    return request.serviceName
      || request.providerService?.serviceName
      || request.providerService?.name
      || request.providerServiceName
      || '';
  }

  getProviderRequestCustomer(request: ServiceRequest): string {
    return request.customerName || '';
  }

  getProviderRequestPet(request: ServiceRequest): string {
    return request.petName || request.pet?.petName || request.pet?.name || '';
  }

  getProviderRequestStatusKey(request: ServiceRequest): string {
    const status = this.providerRequestStatus(request);
    return ['requested', 'accepted', 'completed', 'rejected'].includes(status)
      ? `providerRequests.status.${status}`
      : 'providerRequests.status.unknown';
  }

  profileImageSource(pet: Pet): string | null {
    return this.apiService.resolvePublicUrl(pet.profileImageUrl);
  }

  private loadProviderDashboard(): void {
    this.loadProviderProfile();
    this.loadProviderServices();
    this.loadServiceAreas();
    this.loadProviderRequests();
  }

  private loadProviderProfile(): void {
    this.isLoadingProviderProfile = true;
    this.providerProfileLoadFailed = false;
    this.apiService.get<ApiResponse<Provider>>('/providers/me').subscribe({
      next: (response) => {
        this.providerProfile = response.data || null;
        this.isLoadingProviderProfile = false;
      },
      error: (error: HttpErrorResponse) => {
        this.providerProfile = null;
        this.providerProfileLoadFailed = error.status !== 404;
        this.isLoadingProviderProfile = false;
      }
    });
  }

  private loadProviderServices(): void {
    this.isLoadingProviderServices = true;
    this.providerServicesLoadFailed = false;
    this.apiService.get<ApiResponse<ProviderService[]>>('/provider-services/me').subscribe({
      next: (response) => {
        this.providerServices = response.data || [];
        this.isLoadingProviderServices = false;
      },
      error: () => {
        this.providerServices = [];
        this.providerServicesLoadFailed = true;
        this.isLoadingProviderServices = false;
      }
    });
  }

  private loadServiceAreas(): void {
    this.isLoadingServiceAreas = true;
    this.serviceAreasLoadFailed = false;
    this.apiService.get<ApiResponse<ServiceArea[]>>('/service-areas/me').subscribe({
      next: (response) => {
        this.serviceAreas = response.data || [];
        this.isLoadingServiceAreas = false;
      },
      error: () => {
        this.serviceAreas = [];
        this.serviceAreasLoadFailed = true;
        this.isLoadingServiceAreas = false;
      }
    });
  }

  private loadProviderRequests(): void {
    this.isLoadingProviderRequests = true;
    this.providerRequestsLoadFailed = false;
    this.apiService.get<ApiResponse<ServiceRequest[]>>('/service-requests/provider').subscribe({
      next: (response) => {
        this.providerRequests = response.data || [];
        this.isLoadingProviderRequests = false;
      },
      error: () => {
        this.providerRequests = [];
        this.providerRequestsLoadFailed = true;
        this.isLoadingProviderRequests = false;
      }
    });
  }

  private loadPets(): void {
    this.isLoadingPets = true;
    this.petsLoadFailed = false;
    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: (response) => {
        this.pets = response.data || [];
        this.isLoadingPets = false;
        this.loadHealthRecords();
      },
      error: () => {
        this.petsLoadFailed = true;
        this.healthLoadFailed = true;
        this.isLoadingPets = false;
      }
    });
  }

  private loadReminders(): void {
    this.isLoadingReminders = true;
    this.remindersLoadFailed = false;
    this.apiService.get<ApiResponse<Reminder[]>>('/reminders/upcoming').subscribe({
      next: (response) => {
        this.reminders = response.data || [];
        this.isLoadingReminders = false;
      },
      error: () => {
        this.remindersLoadFailed = true;
        this.isLoadingReminders = false;
      }
    });
  }

  private loadHealthRecords(): void {
    this.healthRecords = [];
    this.healthLoadFailed = false;
    if (!this.pets.length) {
      return;
    }

    this.isLoadingHealth = true;
    const requests = this.pets.map((pet) =>
      this.apiService.get<ApiResponse<HealthRecord[]>>(`/pets/${pet.id}/health-records`).pipe(
        catchError(() => {
          this.healthLoadFailed = true;
          return of({ success: false, message: '', data: [] } as ApiResponse<HealthRecord[]>);
        })
      )
    );

    forkJoin(requests).subscribe((responses) => {
      this.healthRecords = responses.reduce<HealthRecord[]>((records, response, index) => {
        const petId = this.pets[index]?.id;
        return records.concat((response.data || []).map((record) => ({ ...record, petId: record.petId || petId })));
      }, []);
      this.isLoadingHealth = false;
    });
  }

  private loadRequests(): void {
    this.isLoadingRequests = true;
    this.requestsLoadFailed = false;
    this.apiService.get<ApiResponse<ServiceRequest[]>>('/service-requests/my').subscribe({
      next: (response) => {
        this.requests = response.data || [];
        this.isLoadingRequests = false;
      },
      error: () => {
        this.requestsLoadFailed = true;
        this.isLoadingRequests = false;
      }
    });
  }

  private dateValue(value: string | undefined, fallback = 0): number {
    if (!value) {
      return fallback;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  private providerRequestStatus(request: ServiceRequest): string {
    return (request.status || 'Requested').toLowerCase();
  }
}
