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
    return (this.authService.getCurrentUser()?.role || '').toLowerCase().includes('provider');
  }

  get quickActions(): QuickActionDefinition[] {
    return this.isProvider ? PROVIDER_QUICK_ACTIONS : CUSTOMER_QUICK_ACTIONS;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue) {
      this.populate();
      if (!this.isProvider && !this.pets.length) {
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
    this.preferencesService.previewAppearance(this.themeMode, this.accentColor);
  }

  selectAccent(accent: AccentColor): void {
    this.accentColor = accent;
    this.preferencesService.previewAppearance(this.themeMode, this.accentColor);
  }

  close(): void {
    this.preferencesService.restoreAppearance();
    this.closed.emit();
  }

  resetDefaults(): void {
    this.themeMode = 'Light';
    this.accentColor = 'Teal';
    this.defaultPetId = null;
    this.customerFilter = 'All';
    this.providerFilter = 'All';
    this.selectedQuickActions = [...(this.isProvider
      ? PROVIDER_DEFAULT_QUICK_ACTIONS
      : CUSTOMER_DEFAULT_QUICK_ACTIONS)];
    this.successMessage = '';
    this.preferencesService.previewAppearance(this.themeMode, this.accentColor);
  }

  save(): void {
    const request: UpdateUserPreferencesRequest = {
      themeMode: this.themeMode,
      accentColor: this.accentColor,
      displayDensity: 'Comfortable',
      defaultPetId: this.isProvider ? null : this.defaultPetId,
      customerDefaultRequestFilter: this.isProvider ? null : this.customerFilter,
      providerDefaultRequestFilter: this.isProvider ? this.providerFilter : null,
      quickActions: this.selectedQuickActions
    };

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.preferencesService.save(request).subscribe({
      next: (preferences) => {
        this.isSaving = false;
        this.themeMode = preferences.themeMode;
        this.accentColor = preferences.accentColor;
        this.successMessage = 'preferences.saveSuccess';
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'preferences.saveError';
        this.themeMode = this.preferencesService.current.themeMode;
        this.accentColor = this.preferencesService.current.accentColor;
        this.preferencesService.restoreAppearance();
      }
    });
  }

  private populate(): void {
    const value = this.preferencesService.current;
    this.themeMode = value.themeMode;
    this.accentColor = value.accentColor;
    this.defaultPetId = value.defaultPetId;
    this.customerFilter = value.customerDefaultRequestFilter || 'All';
    this.providerFilter = value.providerDefaultRequestFilter || 'All';
    this.selectedQuickActions = [...value.quickActions];
    this.errorMessage = '';
    this.successMessage = '';
  }

  private loadPets(): void {
    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: (response) => this.pets = response.data || [],
      error: () => this.pets = []
    });
  }
}
