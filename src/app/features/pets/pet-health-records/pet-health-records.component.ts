import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HEALTH_RECORD_TYPE_OPTIONS, HealthRecord, HealthRecordPayload, HealthSummary } from '../../../core/models/customer-core.models';

const emptyForm: HealthRecordPayload = {
  recordType: '',
  title: '',
  description: '',
  recordDate: '',
  vetName: '',
  nextDueDate: '',
  reminderRequired: false
};

@Component({
  selector: 'app-pet-health-records',
  templateUrl: './pet-health-records.component.html',
  styleUrls: ['./pet-health-records.component.scss']
})
export class PetHealthRecordsComponent implements OnInit {
  readonly recordTypeOptions = HEALTH_RECORD_TYPE_OPTIONS;
  petId = this.route.snapshot.paramMap.get('petId') || '';
  records: HealthRecord[] = [];
  summary: HealthSummary | null = null;
  form: HealthRecordPayload = { ...emptyForm };
  editingId: string | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadPage();
  }

  loadPage(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.loadSummary();
    this.apiService.get<ApiResponse<HealthRecord[]>>(`/pets/${this.petId}/health-records`).subscribe({
      next: (response) => {
        this.records = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load health records.';
        this.isLoading = false;
      }
    });
  }

  loadSummary(): void {
    this.apiService.get<ApiResponse<HealthSummary>>(`/pets/${this.petId}/health-summary`).subscribe({
      next: (response) => {
        this.summary = response.data;
      },
      error: () => {
        this.summary = null;
      }
    });
  }

  saveRecord(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const isEditing = !!this.editingId;
    const request = this.editingId
      ? this.apiService.put<ApiResponse<HealthRecord>>(`/health-records/${this.editingId}`, this.form)
      : this.apiService.post<ApiResponse<HealthRecord>>(`/pets/${this.petId}/health-records`, this.form);

    request.subscribe({
      next: () => {
        this.resetForm();
        this.successMessage = isEditing ? 'Health record updated.' : 'Health record created.';
        this.loadPage();
      },
      error: () => {
        this.errorMessage = 'Unable to save health record.';
        this.isSaving = false;
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  editRecord(record: HealthRecord): void {
    this.editingId = record.id;
    this.form = {
      recordType: record.recordType || '',
      title: record.title || '',
      description: record.description || '',
      recordDate: this.toDateInput(record.recordDate),
      vetName: record.vetName || record.vetClinicName || '',
      nextDueDate: this.toDateInput(record.nextDueDate),
      reminderRequired: false
    };
  }

  deleteRecord(record: HealthRecord): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.delete<ApiResponse<unknown>>(`/health-records/${record.id}`).subscribe({
      next: () => {
        this.successMessage = 'Health record deleted.';
        this.loadPage();
      },
      error: () => {
        this.errorMessage = 'Unable to delete health record.';
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form = { ...emptyForm };
  }

  private toDateInput(value?: string): string {
    return value ? value.substring(0, 10) : '';
  }
}
