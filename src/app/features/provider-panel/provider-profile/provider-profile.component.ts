import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  Provider,
  ProviderFacility,
  ProviderProfilePayload,
  ProviderType
} from '../../../core/models/marketplace.models';

interface FacilityGroup {
  key: string;
  labelKey: string;
  facilities: ProviderFacility[];
}

const emptyProfileForm: ProviderProfilePayload = {
  businessName: '',
  contactName: '',
  phoneNumber: '',
  email: '',
  websiteUrl: '',
  businessDescription: '',
  addressLine1: '',
  suburb: '',
  state: '',
  postcode: '',
  country: 'Australia',
  isActive: true,
  providerTypeIds: [],
  facilityIds: [],
  supportedSpecies: []
};

@Component({
  selector: 'app-provider-profile',
  templateUrl: './provider-profile.component.html',
  styleUrls: ['./provider-profile.component.scss']
})
export class ProviderProfileComponent implements OnInit {
  private readonly facilityGroupDefinitions = [
    {
      key: 'medical',
      labelKey: 'providerProfile.facilityGroupMedical',
      terms: ['medical', 'veterinary', 'veterinarian', 'vet', 'clinic', 'hospital', 'surgery', 'diagnostic', 'pharmacy', 'vaccin']
    },
    {
      key: 'grooming',
      labelKey: 'providerProfile.facilityGroupGrooming',
      terms: ['groom', 'bath', 'nail', 'coat', 'salon', 'wash']
    },
    {
      key: 'boarding',
      labelKey: 'providerProfile.facilityGroupBoarding',
      terms: ['boarding', 'daycare', 'day care', 'kennel', 'accommodation', 'overnight', 'play area', 'cat area', 'dog area']
    },
    {
      key: 'transport',
      labelKey: 'providerProfile.facilityGroupTransport',
      terms: ['transport', 'travel', 'mobile', 'pickup', 'pick up', 'shuttle', 'ambulance', 'vehicle']
    },
    {
      key: 'specialist',
      labelKey: 'providerProfile.facilityGroupSpecialist',
      terms: ['specialist', 'specialty', 'rehab', 'physio', 'behavio', 'training', 'dental', 'emergency', 'exotic', 'therapy']
    }
  ];

  profile: Provider | null = null;
  providerTypes: ProviderType[] = [];
  facilities: ProviderFacility[] = [];
  speciesOptions: string[] = [];
  form: ProviderProfilePayload = { ...emptyProfileForm };
  facilitySearch = '';
  isEditorOpen = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadReferenceData();
    this.loadProfile();
  }

  get hasProfile(): boolean {
    return !!this.profile?.id;
  }

  get statusLabel(): string {
    if (this.profile?.isActive === false) {
      return 'providerProfile.statusInactive';
    }

    return this.profile?.verificationStatus?.toLowerCase() === 'verified'
      ? 'providerProfile.statusVerified'
      : 'providerProfile.statusActive';
  }

  get statusTone(): 'success' | 'warning' | 'neutral' {
    if (this.profile?.isActive === false) {
      return 'neutral';
    }

    return this.profile?.verificationStatus?.toLowerCase() === 'verified' ? 'success' : 'warning';
  }

  get locationLabel(): string {
    return [this.profile?.suburb, this.profile?.state, this.profile?.postcode].filter(Boolean).join(', ');
  }

  get completedProfileItems(): number {
    return this.profileChecklist.filter((item) => item.complete).length;
  }

  get profileCompletion(): number {
    return Math.round((this.completedProfileItems / this.profileChecklist.length) * 100);
  }

  get profileChecklist(): Array<{ label: string; complete: boolean }> {
    const profile = this.profile;
    return [
      { label: 'providerProfile.checkBusiness', complete: !!profile?.businessName },
      { label: 'providerProfile.checkContact', complete: !!(profile?.phoneNumber || profile?.phone || profile?.email) },
      { label: 'providerProfile.checkDescription', complete: !!(profile?.businessDescription || profile?.description) },
      { label: 'providerProfile.checkTypes', complete: !!profile?.providerTypes?.length },
      { label: 'providerProfile.checkSpecies', complete: !!profile?.supportedSpecies?.length },
      { label: 'providerProfile.checkLocation', complete: !!(profile?.addressLine1 && profile?.suburb && profile?.state && profile?.postcode) }
    ];
  }

  get isSetupComplete(): boolean {
    return this.profile?.isSetupComplete === true;
  }

  get selectedFacilities(): ProviderFacility[] {
    const availableFacilities = new Map(
      [...this.facilities, ...(this.profile?.facilities || [])].map((facility) => [facility.id, facility])
    );

    return this.form.facilityIds
      .map((id) => availableFacilities.get(id))
      .filter((facility): facility is ProviderFacility => !!facility);
  }

  get facilityGroups(): FacilityGroup[] {
    const query = this.normalizeSearchValue(this.facilitySearch);

    return this.facilityGroupDefinitions
      .map((group) => ({
        key: group.key,
        labelKey: group.labelKey,
        facilities: this.facilities.filter((facility) => {
          const matchesGroup = this.getFacilityGroupKey(facility) === group.key;
          const matchesSearch = !query || this.normalizeSearchValue([
            facility.name,
            facility.description,
            facility.category,
            facility.key
          ].filter(Boolean).join(' ')).includes(query);

          return matchesGroup && matchesSearch;
        })
      }))
      .filter((group) => group.facilities.length > 0);
  }

  loadReferenceData(): void {
    this.apiService.get<ApiResponse<ProviderType[]>>('/provider-types').subscribe({
      next: (response) => this.providerTypes = response.data || []
    });
    this.apiService.get<ApiResponse<ProviderFacility[]>>('/provider-facilities').subscribe({
      next: (response) => this.facilities = response.data || []
    });
    this.apiService.get<ApiResponse<string[]>>('/pet-species').subscribe({
      next: (response) => this.speciesOptions = response.data || []
    });
  }

  toggleProviderType(id: string): void {
    this.form.providerTypeIds = this.toggleValue(this.form.providerTypeIds, id);
  }

  toggleFacility(id: string): void {
    this.form.facilityIds = this.toggleValue(this.form.facilityIds, id);
  }

  toggleSpecies(species: string): void {
    this.form.supportedSpecies = this.toggleValue(this.form.supportedSpecies, species);
  }

  isSelected(values: string[], value: string): boolean {
    return values.includes(value);
  }

  openEditor(): void {
    this.form = this.profile ? this.toForm(this.profile) : { ...emptyProfileForm };
    this.facilitySearch = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.isEditorOpen = true;
  }

  closeEditor(): void {
    if (this.isSaving) {
      return;
    }

    this.isEditorOpen = false;
    this.form = this.profile ? this.toForm(this.profile) : { ...emptyProfileForm };
    this.facilitySearch = '';
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<Provider>>('/providers/me').subscribe({
      next: (response) => {
        this.profile = response.data || null;
        this.form = this.profile ? this.toForm(this.profile) : { ...emptyProfileForm };
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.profile = null;
        this.form = { ...emptyProfileForm };
        if (error.status !== 404) {
          this.errorMessage = 'providerProfile.loadError';
        }
        this.isLoading = false;
      }
    });
  }

  saveProfile(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const isEditing = this.hasProfile;

    const request = isEditing
      ? this.apiService.put<ApiResponse<Provider>>('/providers/me', this.form)
      : this.apiService.post<ApiResponse<Provider>>('/providers/me', this.form);

    request.subscribe({
      next: (response) => {
        this.profile = response.data;
        this.form = this.toForm(response.data);
        this.successMessage = isEditing ? 'providerProfile.updateSuccess' : 'providerProfile.createSuccess';
        this.isEditorOpen = false;
      },
      error: () => {
        this.errorMessage = 'providerProfile.saveError';
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  private toForm(profile: Provider): ProviderProfilePayload {
    return {
      businessName: profile.businessName || '',
      contactName: profile.contactName || '',
      phoneNumber: profile.phoneNumber || profile.phone || '',
      email: profile.email || '',
      websiteUrl: profile.websiteUrl || profile.website || '',
      businessDescription: profile.businessDescription || profile.description || '',
      addressLine1: profile.addressLine1 || '',
      addressLine2: profile.addressLine2 || '',
      suburb: profile.suburb || '',
      state: profile.state || '',
      postcode: profile.postcode || '',
      country: profile.country || 'Australia',
      isActive: profile.isActive !== false,
      providerTypeIds: (profile.providerTypes || []).map((item) => item.id),
      facilityIds: (profile.facilities || []).map((item) => item.id),
      supportedSpecies: [...(profile.supportedSpecies || [])]
    };
  }

  private toggleValue(values: string[], value: string): string[] {
    return values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
  }

  private getFacilityGroupKey(facility: ProviderFacility): string {
    const source = this.normalizeSearchValue([
      facility.category,
      facility.key,
      facility.name
    ].filter(Boolean).join(' '));

    return this.facilityGroupDefinitions.find((group) =>
      group.terms.some((term) => source.includes(term))
    )?.key || 'specialist';
  }

  private normalizeSearchValue(value: string): string {
    return value
      .toLocaleLowerCase()
      .replace(/[_/-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
