import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ApiResponse } from '../../core/models/api-response.model';
import { HealthRecord, Pet, Reminder } from '../../core/models/customer-core.models';
import { ServiceRequest } from '../../core/models/marketplace.models';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  readonly currentUser = this.authService.getCurrentUser();
  pets: Pet[] = [];
  reminders: Reminder[] = [];
  healthRecords: HealthRecord[] = [];
  requests: ServiceRequest[] = [];
  isLoadingPets = false;
  isLoadingReminders = false;
  isLoadingHealth = false;
  isLoadingRequests = false;
  petsLoadFailed = false;
  remindersLoadFailed = false;
  healthLoadFailed = false;
  requestsLoadFailed = false;

  constructor(
    private readonly authService: AuthService,
    private readonly apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.loadPets();
    this.loadReminders();
    this.loadRequests();
  }

  get displayName(): string {
    const name = this.currentUser?.name || '';
    return name.includes('@') ? name.split('@')[0] : name;
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

  profileImageSource(pet: Pet): string | null {
    return this.apiService.resolvePublicUrl(pet.profileImageUrl);
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
}
