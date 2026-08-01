import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';

import { ApiService } from '../api/api.service';
import { AuthService } from '../auth/auth.service';
import { ApiResponse } from '../models/api-response.model';
import {
  CUSTOMER_QUICK_ACTIONS,
  CUSTOMER_DEFAULT_QUICK_ACTIONS,
  AccentColor,
  PROVIDER_DEFAULT_QUICK_ACTIONS,
  PROVIDER_QUICK_ACTIONS,
  UpdateUserPreferencesRequest,
  UserPreferences
} from './user-preferences.models';

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

    this.loadingRequest = this.apiService.get<ApiResponse<UserPreferences>>('/user-preferences/me').pipe(
      map((response) => this.normalize(response.data)),
      catchError(() => of(this.createDefaults())),
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
    return this.apiService.put<ApiResponse<UserPreferences>>('/user-preferences/me', request).pipe(
      map((response) => {
        const confirmedAccent = this.normalizeAccent(response.data?.accentColor);
        if (!response.data || !confirmedAccent) {
          throw new Error('The preferences response did not confirm the selected accent color.');
        }

        return this.normalize({ ...response.data, accentColor: confirmedAccent });
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
    return {
      themeMode: 'Light',
      accentColor: 'Teal',
      displayDensity: 'Comfortable',
      defaultPetId: null,
      customerDefaultRequestFilter: isProvider ? null : 'All',
      providerDefaultRequestFilter: isProvider ? 'All' : null,
      quickActions: [...(isProvider ? PROVIDER_DEFAULT_QUICK_ACTIONS : CUSTOMER_DEFAULT_QUICK_ACTIONS)]
    };
  }

  private normalize(value: UserPreferences | null | undefined): UserPreferences {
    const defaults = this.createDefaults();
    if (!value) {
      return defaults;
    }

    const allowedActions = new Set(
      (this.isProvider ? PROVIDER_QUICK_ACTIONS : CUSTOMER_QUICK_ACTIONS).map((action) => action.key)
    );
    const normalizedAccent = this.normalizeAccent(value.accentColor);
    return {
      ...defaults,
      ...value,
      themeMode: String(value.themeMode || '').toLowerCase() === 'dark' ? 'Dark' : 'Light',
      accentColor: normalizedAccent || 'Teal',
      displayDensity: 'Comfortable',
      quickActions: Array.isArray(value.quickActions)
        ? value.quickActions.filter((action) => allowedActions.has(action))
        : defaults.quickActions
    };
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

  private get isProvider(): boolean {
    return (this.authService.getCurrentUser()?.role || '').toLowerCase().includes('provider');
  }
}
