import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';

import { ApiService } from '../api/api.service';
import { AuthService } from '../auth/auth.service';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../../environments/environment';
import {
  CUSTOMER_QUICK_ACTIONS,
  CUSTOMER_DEFAULT_QUICK_ACTIONS,
  AccentColor,
  CustomerRequestFilter,
  PROVIDER_DEFAULT_QUICK_ACTIONS,
  PROVIDER_QUICK_ACTIONS,
  ProviderRequestFilter,
  UpdateUserPreferencesRequest,
  UserPreferences
} from './user-preferences.models';

type PreferencesPayload = Partial<UserPreferences> | null;
type PreferencesSaveResponse = ApiResponse<PreferencesPayload> | Partial<UserPreferences> | null;

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly subject = new BehaviorSubject<UserPreferences>(this.createDefaults());
  private loaded = false;
  private loadingRequest?: Observable<UserPreferences>;

  readonly preferences$ = this.subject.asObservable();

  constructor(
    private readonly apiService: ApiService,
    private readonly authService: AuthService
  ) {
    this.applyToDocument(this.subject.value);
  }

  get current(): UserPreferences {
    return this.subject.value;
  }

  load(force = false): Observable<UserPreferences> {
    if (this.loadingRequest) {
      return this.loadingRequest;
    }
    if (this.loaded && !force) {
      return of(this.current);
    }

    if (!environment.preferencesApiEnabled) {
      // Local appearance defaults are not remote persistence.
      return of(this.current);
    }

    this.loadingRequest = this.apiService.get<ApiResponse<UserPreferences>>('/v1/identity/preferences/me').pipe(
      map((response) => {
        if (!response?.success || !response.data) {
          throw new Error(response?.message || 'User preferences unavailable.');
        }
        return this.normalize(response.data);
      }),
      tap((preferences) => {
        this.loaded = true;
        this.subject.next(preferences);
        this.applyToDocument(preferences);
      }),
      finalize(() => this.loadingRequest = undefined),
      shareReplay(1)
    );
    return this.loadingRequest;
  }

  save(request: UpdateUserPreferencesRequest): Observable<UserPreferences> {
    if (!environment.preferencesApiEnabled) {
      return throwError(() => new Error('User preferences persistence is not enabled.'));
    }

    return this.apiService.put<PreferencesSaveResponse>('/v1/identity/preferences/me', request).pipe(
      map((response) => {
        if (!this.isApiResponse(response) || response.success !== true || !response.data) {
          throw new Error(this.isApiResponse(response) ? response.message || 'Could not save preferences.' : 'Invalid preferences response.');
        }
        return this.mergeSuccessfulSave(request, response.data);
      }),
      tap((preferences) => {
        this.loaded = true;
        this.subject.next(preferences);
        this.applyToDocument(preferences);
      })
    );
  }

  resetSession(): void {
    this.loaded = false;
    this.loadingRequest = undefined;
    const defaults = this.createDefaults();
    this.subject.next(defaults);
    this.applyToDocument(defaults);
  }

  previewAppearance(themeMode: UserPreferences['themeMode'], accentColor: UserPreferences['accentColor']): void {
    this.applyToDocument({ ...this.current, themeMode, accentColor });
  }

  restoreAppearance(): void {
    this.applyToDocument(this.current);
  }

  private createDefaults(): UserPreferences {
    const isProvider = this.isProvider;
    const isCustomer = this.isCustomer;

    return {
      themeMode: 'Light',
      accentColor: 'Teal',
      displayDensity: 'Comfortable',
      defaultPetId: null,
      customerDefaultRequestFilter: isCustomer ? 'All' : null,
      providerDefaultRequestFilter: isProvider ? 'All' : null,
      quickActions: [
        ...(isProvider
          ? PROVIDER_DEFAULT_QUICK_ACTIONS
          : isCustomer
            ? CUSTOMER_DEFAULT_QUICK_ACTIONS
            : [])
      ]
    };
  }

  private normalize(value: Partial<UserPreferences> | null | undefined): UserPreferences {
    const defaults = this.createDefaults();
    if (!value) {
      return defaults;
    }

    const isProvider = this.isProvider;
    const isCustomer = this.isCustomer;
    const allowedActionDefinitions = isProvider
      ? PROVIDER_QUICK_ACTIONS
      : isCustomer
        ? CUSTOMER_QUICK_ACTIONS
        : [];
    const allowedActions = new Set(allowedActionDefinitions.map((action) => action.key));
    const normalizedAccent = this.normalizeAccent(value.accentColor);

    return {
      ...defaults,
      ...value,
      themeMode: String(value.themeMode || defaults.themeMode).toLowerCase() === 'dark' ? 'Dark' : 'Light',
      accentColor: normalizedAccent || defaults.accentColor,
      displayDensity: 'Comfortable',
      defaultPetId: isCustomer ? (value.defaultPetId ?? null) : null,
      customerDefaultRequestFilter: isCustomer
        ? this.normalizeCustomerFilter(value.customerDefaultRequestFilter) || defaults.customerDefaultRequestFilter
        : null,
      providerDefaultRequestFilter: isProvider
        ? this.normalizeProviderFilter(value.providerDefaultRequestFilter) || defaults.providerDefaultRequestFilter
        : null,
      quickActions: Array.isArray(value.quickActions)
        ? value.quickActions.filter((action) => allowedActions.has(action))
        : defaults.quickActions
    };
  }

  private mergeSuccessfulSave(
    request: UpdateUserPreferencesRequest,
    responseData?: Partial<UserPreferences>
  ): UserPreferences {
    const responseTheme = String(responseData?.themeMode || '').toLowerCase();
    const confirmedTheme = responseTheme === 'dark'
      ? 'Dark'
      : responseTheme === 'light'
        ? 'Light'
        : request.themeMode;
    const confirmedAccent = this.normalizeAccent(responseData?.accentColor) || request.accentColor;
    const confirmedQuickActions = responseData && Array.isArray(responseData.quickActions)
      ? responseData.quickActions
      : request.quickActions;

    return this.normalize({
      ...this.current,
      ...request,
      ...(responseData || {}),
      themeMode: confirmedTheme,
      accentColor: confirmedAccent,
      displayDensity: responseData?.displayDensity || request.displayDensity,
      defaultPetId: responseData?.defaultPetId !== undefined ? responseData.defaultPetId : request.defaultPetId,
      customerDefaultRequestFilter: responseData?.customerDefaultRequestFilter !== undefined
        ? responseData.customerDefaultRequestFilter
        : request.customerDefaultRequestFilter,
      providerDefaultRequestFilter: responseData?.providerDefaultRequestFilter !== undefined
        ? responseData.providerDefaultRequestFilter
        : request.providerDefaultRequestFilter,
      quickActions: confirmedQuickActions
    });
  }

  private applyToDocument(preferences: UserPreferences): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', preferences.themeMode.toLowerCase());
    root.setAttribute('data-accent', preferences.accentColor.toLowerCase());
    root.removeAttribute('data-theme-mode');
    root.removeAttribute('data-density');
  }

  private normalizeAccent(value: unknown): AccentColor | undefined {
    const allowedAccents: AccentColor[] = ['Teal', 'Coral', 'Blue', 'Purple', 'Green'];
    return allowedAccents.find((accent) => accent.toLowerCase() === String(value || '').toLowerCase());
  }

  private normalizeCustomerFilter(value: unknown): CustomerRequestFilter | undefined {
    const allowed: CustomerRequestFilter[] = ['All', 'Active', 'Completed', 'Rejected'];
    return allowed.find((filter) => filter.toLowerCase() === String(value || '').toLowerCase());
  }

  private normalizeProviderFilter(value: unknown): ProviderRequestFilter | undefined {
    const allowed: ProviderRequestFilter[] = ['All', 'New', 'Accepted', 'Completed', 'Rejected'];
    return allowed.find((filter) => filter.toLowerCase() === String(value || '').toLowerCase());
  }

  private isApiResponse(value: PreferencesSaveResponse): value is ApiResponse<PreferencesPayload> {
    return !!value && typeof value === 'object' && 'success' in value;
  }

  private get currentRole(): string {
    return (this.authService.getCurrentUser()?.role || '').trim().toLowerCase();
  }

  private get isProvider(): boolean {
    return this.currentRole.includes('provider');
  }

  private get isCustomer(): boolean {
    return this.currentRole.includes('customer');
  }
}
