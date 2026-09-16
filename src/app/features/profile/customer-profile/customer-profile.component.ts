import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { ApiService } from '../../../core/api/api.service';
import { apiErrorMessage } from '../../../core/api/api-error.util';
import { ApiResponse } from '../../../core/models/api-response.model';
import { CustomerProfile, CustomerProfilePayload } from '../../../core/models/customer-core.models';
import { GeographyArea } from '../../../core/models/marketplace.models';

const emptyPayload: CustomerProfilePayload = {
  address: '',
  country: 'Australia',
  state: '',
  city: '',
  suburb: '',
  postcode: '',
  preferredContactMethod: '',
  notificationByEmail: true,
  notificationInApp: true,
  marketingConsent: false
};

@Component({
  selector: 'app-customer-profile',
  templateUrl: './customer-profile.component.html',
  styleUrls: ['./customer-profile.component.scss']
})
export class CustomerProfileComponent implements OnInit, OnDestroy {
  readonly contactOptions = ['Email', 'Mobile', 'InApp'];
  profile: CustomerProfile | null = null;
  form: CustomerProfilePayload = { ...emptyPayload };
  geographyMatches: GeographyArea[] = [];
  isLoading = false;
  isSaving = false;
  isLookingUpGeography = false;
  errorMessage = '';
  successMessage = '';

  private readonly postcodeLookup$ = new Subject<string>();
  private readonly suburbLookup$ = new Subject<string>();
  private readonly subscriptions = new Subscription();
  private applyingGeographyLookup = false;

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.bindGeographyLookup();
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.apiService.get<ApiResponse<CustomerProfile>>('/customer/profile').subscribe({
      next: (response) => {
        this.profile = response.data;
        this.form = {
          address: response.data.address || '', country: response.data.country || 'Australia',
          state: response.data.state || '', city: response.data.city || '', suburb: response.data.suburb || '',
          postcode: response.data.postcode || '', preferredContactMethod: response.data.preferredContactMethod || '',
          notificationByEmail: response.data.notificationByEmail, notificationInApp: response.data.notificationInApp,
          marketingConsent: response.data.marketingConsent
        };
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = apiErrorMessage(error, 'Unable to load customer profile.');
        this.isLoading = false;
      }
    });
  }

  onPostcodeChange(value: string | number | boolean | null): void {
    const raw = typeof value === 'string' ? value : '';
    this.form.postcode = raw.replace(/\D/g, '').slice(0, 4);
    if (this.applyingGeographyLookup) return;
    this.geographyMatches = [];
    const postcode = this.form.postcode.trim();
    if (/^\d{4}$/.test(postcode)) this.postcodeLookup$.next(postcode);
  }

  onSuburbChange(value: string | number | boolean | null): void {
    this.form.suburb = typeof value === 'string' ? value : '';
    if (this.applyingGeographyLookup) return;
    this.geographyMatches = [];
    const suburb = this.form.suburb.trim();
    if (suburb.length >= 2) this.suburbLookup$.next(suburb);
  }

  applyGeography(area: GeographyArea): void {
    this.applyingGeographyLookup = true;
    this.form.suburb = area.suburb || '';
    this.form.postcode = area.postcode || '';
    this.form.state = area.state || '';
    this.form.city = area.city || '';
    this.form.country = area.country || 'Australia';
    this.geographyMatches = [];
    queueMicrotask(() => this.applyingGeographyLookup = false);
  }

  save(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.put<ApiResponse<CustomerProfile>>('/customer/profile', this.form).subscribe({
      next: (response) => {
        this.profile = response.data;
        this.successMessage = 'Profile saved successfully.';
        this.isSaving = false;
      },
      error: (error) => {
        this.errorMessage = apiErrorMessage(error, 'Unable to save customer profile.');
        this.isSaving = false;
      }
    });
  }

  private bindGeographyLookup(): void {
    this.subscriptions.add(this.postcodeLookup$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((postcode) => {
        this.isLookingUpGeography = true;
        return this.apiService
          .get<ApiResponse<GeographyArea[]>>(`/geography/by-postcode/${encodeURIComponent(postcode)}`)
          .pipe(catchError(() => of({ success: false, data: [] } as ApiResponse<GeographyArea[]>)));
      })
    ).subscribe((response) => this.handleGeographyMatches(response.data || [])));

    this.subscriptions.add(this.suburbLookup$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((suburb) => {
        this.isLookingUpGeography = true;
        return this.apiService
          .get<ApiResponse<GeographyArea[]>>(`/geography/by-suburb/${encodeURIComponent(suburb)}`)
          .pipe(catchError(() => of({ success: false, data: [] } as ApiResponse<GeographyArea[]>)));
      })
    ).subscribe((response) => this.handleGeographyMatches(response.data || [])));
  }

  private handleGeographyMatches(matches: GeographyArea[]): void {
    this.isLookingUpGeography = false;
    this.geographyMatches = matches;
    if (matches.length === 1) this.applyGeography(matches[0]);
  }
}
