import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { apiErrorMessage } from '../../../core/api/api-error.util';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { GeographyArea } from '../../../core/models/marketplace.models';

interface GeographyForm {
  city: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  sortOrder: number;
  isActive: boolean;
}

@Component({
  selector: 'app-admin-geography',
  templateUrl: './admin-geography.component.html',
  styleUrls: ['./admin-geography.component.scss']
})
export class AdminGeographyComponent implements OnInit {
  areas: GeographyArea[] = [];
  form = this.emptyForm();
  editingId: string | null = null;
  search = '';
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  postcodeMatches: GeographyArea[] = [];
  isPostcodeLookupLoading = false;

  constructor(private readonly api: ApiService, private readonly i18n: I18nService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const q = this.search.trim() ? `?search=${encodeURIComponent(this.search.trim())}` : '';
    this.api.get<ApiResponse<GeographyArea[]>>(`/admin/geography${q}`).subscribe({
      next: (response) => { this.areas = response.data || []; this.isLoading = false; },
      error: (error) => { this.errorMessage = apiErrorMessage(error, 'adminGeography.loadError'); this.isLoading = false; }
    });
  }


  onPostcodeChange(value: string): void {
    const postcode = (value || '').replace(/\D/g, '').slice(0, 4);
    this.form.postcode = postcode;
    this.postcodeMatches = [];
    if (!/^\d{4}$/.test(postcode)) return;

    this.isPostcodeLookupLoading = true;
    this.api.get<ApiResponse<GeographyArea[]>>(`/geography/by-postcode/${encodeURIComponent(postcode)}`).subscribe({
      next: (response) => {
        this.postcodeMatches = response.data || [];
        this.isPostcodeLookupLoading = false;
        if (this.postcodeMatches.length === 1) this.applyPostcodeMatch(this.postcodeMatches[0]);
      },
      error: () => {
        this.isPostcodeLookupLoading = false;
        this.postcodeMatches = [];
      }
    });
  }

  applyPostcodeMatch(area: GeographyArea): void {
    this.form.postcode = area.postcode || this.form.postcode;
    this.form.suburb = area.suburb || this.form.suburb;
    this.form.city = area.city || 'Sydney';
    this.form.state = area.state || 'NSW';
    this.form.country = area.country || 'Australia';
    this.postcodeMatches = [];
  }

  save(): void {
    const postcode = this.form.postcode.trim();
    if (!/^\d{4}$/.test(postcode)) {
      this.errorMessage = 'adminGeography.postcodeValidation';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const payload: GeographyForm = {
      city: this.form.city.trim(),
      suburb: this.form.suburb.trim(),
      state: this.form.state.trim().toUpperCase(),
      postcode,
      country: this.form.country.trim() || 'Australia',
      sortOrder: Number(this.form.sortOrder) || 0,
      isActive: !!this.form.isActive
    };
    const request = this.editingId
      ? this.api.put<ApiResponse<GeographyArea>>(`/admin/geography/${this.editingId}`, payload)
      : this.api.post<ApiResponse<GeographyArea>>('/admin/geography', payload);
    request.subscribe({
      next: () => { this.successMessage = this.editingId ? 'adminGeography.updated' : 'adminGeography.created'; this.reset(); this.load(); },
      error: (error) => { this.errorMessage = apiErrorMessage(error, 'adminGeography.saveError'); this.isSaving = false; }
    });
  }

  edit(item: GeographyArea): void {
    this.editingId = item.id;
    this.form = {
      city: item.city,
      suburb: item.suburb,
      state: item.state,
      postcode: item.postcode,
      country: item.country || 'Australia',
      sortOrder: item.sortOrder || 0,
      isActive: item.isActive !== false
    };
  }

  remove(item: GeographyArea): void {
    if (!window.confirm(`${this.i18n.translate('adminGeography.removeConfirm')} ${item.suburb} ${item.postcode}?`)) return;
    this.api.delete<ApiResponse<unknown>>(`/admin/geography/${item.id}`).subscribe({
      next: () => { this.successMessage = 'adminGeography.removed'; this.load(); },
      error: (error) => this.errorMessage = apiErrorMessage(error, 'adminGeography.removeError')
    });
  }

  reset(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.postcodeMatches = [];
    this.isPostcodeLookupLoading = false;
    this.isSaving = false;
  }

  private emptyForm(): GeographyForm {
    return { city: 'Sydney', suburb: '', state: 'NSW', postcode: '', country: 'Australia', sortOrder: 0, isActive: true };
  }
}
