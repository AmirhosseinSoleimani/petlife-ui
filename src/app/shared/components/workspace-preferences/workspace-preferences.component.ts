import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet } from '../../../core/models/customer-core.models';
import {
  CUSTOMER_QUICK_ACTIONS,
  CUSTOMER_DEFAULT_QUICK_ACTIONS,
  AccentColor,
  CustomerRequestFilter,
  PROVIDER_QUICK_ACTIONS,
  PROVIDER_DEFAULT_QUICK_ACTIONS,
  ProviderRequestFilter,
  QuickActionDefinition,
  ThemeMode,
  UpdateUserPreferencesRequest
} from '../../../core/preferences/user-preferences.models';
import { UserPreferencesService } from '../../../core/preferences/user-preferences.service';

@Component({
  selector: 'app-workspace-preferences',
  templateUrl: './workspace-preferences.component.html',
  styleUrls: ['./workspace-preferences.component.scss']
})
export class WorkspacePreferencesComponent implements OnChanges {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  readonly themes: ThemeMode[] = ['Light', 'Dark'];
  readonly accentColors: AccentColor[] = ['Teal', 'Coral', 'Blue', 'Purple', 'Green'];
  readonly customerFilters: CustomerRequestFilter[] = ['All', 'Active', 'Completed', 'Rejected'];
  readonly providerFilters: ProviderRequestFilter[] = ['All', 'New', 'Accepted', 'Completed', 'Rejected'];

  pets: Pet[] = [];
  themeMode: ThemeMode = 'Light';
  accentColor: AccentColor = 'Teal';
  defaultPetId: string | null = null;
  customerFilter: CustomerRequestFilter = 'All';
  providerFilter: ProviderRequestFilter = 'All';
  selectedQuickActions: string[] = [];
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly authService: AuthService,
    private readonly preferencesService: UserPreferencesService
  ) {}

  get isProvider(): boolean {
    return this.currentRole.includes('provider');
  }

  get isCustomer(): boolean {
    return this.currentRole.includes('customer');
  }

  get hasRoleSpecificPreferences(): boolean {
    return this.isCustomer || this.isProvider;
  }

  get quickActions(): QuickActionDefinition[] {
    if (this.isProvider) {
      return PROVIDER_QUICK_ACTIONS;
    }
    if (this.isCustomer) {
      return CUSTOMER_QUICK_ACTIONS;
    }
    return [];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue) {
      this.populate();
      if (this.isCustomer && !this.pets.length) {
        this.loadPets();
      }
    }
  }

  toggleQuickAction(key: string, selected: boolean): void {
    this.selectedQuickActions = selected
      ? [...this.selectedQuickActions, key].filter((value, index, values) => values.indexOf(value) === index)
      : this.selectedQuickActions.filter((value) => value !== key);
  }

  selectTheme(theme: ThemeMode): void {
    this.themeMode = theme;
    this.successMessage = '';
    this.preferencesService.previewAppearance(this.themeMode, this.accentColor);
  }

  selectAccent(accent: AccentColor): void {
    this.accentColor = accent;
    this.successMessage = '';
    this.preferencesService.previewAppearance(this.themeMode, this.accentColor);
  }

  close(): void {
    if (this.isSaving) {
      return;
    }
    this.preferencesService.restoreAppearance();
    this.closed.emit();
  }

  resetDefaults(): void {
    this.themeMode = 'Light';
    this.accentColor = 'Teal';
    this.defaultPetId = null;
    this.customerFilter = 'All';
    this.providerFilter = 'All';
    this.selectedQuickActions = this.defaultQuickActions;
    this.errorMessage = '';
    this.successMessage = '';
    this.preferencesService.previewAppearance(this.themeMode, this.accentColor);
  }

  save(): void {
    if (this.isSaving) {
      return;
    }

    const request: UpdateUserPreferencesRequest = {
      themeMode: this.themeMode,
      accentColor: this.accentColor,
      displayDensity: 'Comfortable',
      defaultPetId: this.isCustomer ? this.defaultPetId : null,
      customerDefaultRequestFilter: this.isCustomer ? this.customerFilter : null,
      providerDefaultRequestFilter: this.isProvider ? this.providerFilter : null,
      quickActions: this.hasRoleSpecificPreferences ? this.selectedQuickActions : []
    };

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.preferencesService.save(request).subscribe({
      next: (preferences) => {
        this.isSaving = false;
        this.themeMode = preferences.themeMode;
        this.accentColor = preferences.accentColor;
        this.defaultPetId = preferences.defaultPetId;
        this.customerFilter = preferences.customerDefaultRequestFilter || 'All';
        this.providerFilter = preferences.providerDefaultRequestFilter || 'All';
        this.selectedQuickActions = [...preferences.quickActions];
        this.successMessage = 'preferences.saveSuccess';
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'preferences.saveError';
        this.populateFromSavedPreferences();
        this.preferencesService.restoreAppearance();
      }
    });
  }

  private populate(): void {
    this.populateFromSavedPreferences();
    this.errorMessage = '';
    this.successMessage = '';
  }

  private populateFromSavedPreferences(): void {
    const value = this.preferencesService.current;
    this.themeMode = value.themeMode;
    this.accentColor = value.accentColor;
    this.defaultPetId = this.isCustomer ? value.defaultPetId : null;
    this.customerFilter = this.isCustomer ? (value.customerDefaultRequestFilter || 'All') : 'All';
    this.providerFilter = this.isProvider ? (value.providerDefaultRequestFilter || 'All') : 'All';
    this.selectedQuickActions = this.hasRoleSpecificPreferences ? [...value.quickActions] : [];
  }

  private loadPets(): void {
    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: (response) => this.pets = response.data || [],
      error: () => this.pets = []
    });
  }

  private get defaultQuickActions(): string[] {
    if (this.isProvider) {
      return [...PROVIDER_DEFAULT_QUICK_ACTIONS];
    }
    if (this.isCustomer) {
      return [...CUSTOMER_DEFAULT_QUICK_ACTIONS];
    }
    return [];
  }

  private get currentRole(): string {
    return (this.authService.getCurrentUser()?.role || '').trim().toLowerCase();
  }
}
