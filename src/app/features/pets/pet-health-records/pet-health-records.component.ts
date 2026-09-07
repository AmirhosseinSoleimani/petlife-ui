import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { FileAsset, HEALTH_RECORD_TYPE_OPTIONS, HealthRecord, HealthRecordPayload, HealthSummary } from '../../../core/models/customer-core.models';
import { AppFileUploadComponent } from '../../../shared/components/app-file-upload/app-file-upload.component';

const newEmptyForm = (): HealthRecordPayload => ({
  recordType: 'General', title: '', description: '', recordDate: '', vetClinicName: '', vetName: '', nextDueDate: '',
  dosage: '', frequency: '', vaccineName: '', vaccineManufacturer: '', vaccineBatchNumber: '', medicationName: '',
  doseAmount: null, doseUnit: '', administrationRoute: '', preventiveCareType: '', visitReason: '', visitOutcome: '',
  measurementType: '', measurementValue: null, measurementUnit: '', reminderRequired: false
});

@Component({
  selector: 'app-pet-health-records',
  templateUrl: './pet-health-records.component.html',
  styleUrls: ['./pet-health-records.component.scss']
})
export class PetHealthRecordsComponent implements OnInit {
  @ViewChild('attachmentUpload') attachmentUpload?: AppFileUploadComponent;

  readonly recordTypeOptions = HEALTH_RECORD_TYPE_OPTIONS;
  readonly doseUnitOptions = ['mg', 'g', 'mL', 'tablet', 'capsule', 'drop', 'other'];
  readonly routeOptions = ['Oral', 'Topical', 'Injection', 'Ophthalmic', 'Otic', 'Other'];
  readonly measurementTypeOptions = ['Weight', 'Temperature', 'Heart rate', 'Respiratory rate', 'Body condition score', 'Other'];
  readonly measurementUnitOptions = ['kg', 'g', '°C', '°F', 'bpm', 'breaths/min', 'score', 'cm', 'other'];
  readonly attachmentExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  readonly attachmentContentTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  readonly attachmentMaxSize = 10 * 1024 * 1024;

  petId = '';
  records: HealthRecord[] = [];
  summary: HealthSummary | null = null;
  measurements: HealthRecord[] = [];
  form: HealthRecordPayload = newEmptyForm();
  editingId: string | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  attachments: Record<string, FileAsset[]> = {};
  attachmentErrors: Record<string, string> = {};
  loadingAttachmentRecordIds = new Set<string>();
  deletingAttachmentIds = new Set<string>();
  selectedAttachmentFilesForCreate: File[] = [];
  selectedAttachmentFilesForEdit: File[] = [];

  constructor(private readonly apiService: ApiService, private readonly route: ActivatedRoute) {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
  }

  ngOnInit(): void {
    this.loadPage();
  }

  get editingRecord(): HealthRecord | null {
    return this.records.find((record) => record.id === this.editingId) || null;
  }

  get isVaccination(): boolean { return this.form.recordType === 'Vaccination'; }
  get isMedication(): boolean { return this.form.recordType === 'Medication'; }
  get isPreventiveCare(): boolean { return this.form.recordType === 'PreventiveCare'; }
  get isVetVisit(): boolean { return this.form.recordType === 'VetVisit'; }
  get isMeasurement(): boolean { return this.form.recordType === 'Measurement'; }

  loadPage(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.loadSummary();
    this.loadMeasurements();
    this.apiService.get<ApiResponse<HealthRecord[]>>(`/pets/${this.petId}/health-records`).subscribe({
      next: (response) => {
        this.records = response.data || [];
        this.attachments = {};
        this.attachmentErrors = {};
        this.records.forEach((record) => this.loadAttachments(record.id));
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
      next: (response) => { this.summary = response.data; },
      error: () => { this.summary = null; }
    });
  }

  loadMeasurements(): void {
    this.apiService.get<ApiResponse<HealthRecord[]>>(`/pets/${this.petId}/health-records/measurements`).subscribe({
      next: (response) => { this.measurements = response.data || []; },
      error: () => { this.measurements = []; }
    });
  }

  onRecordTypeChange(value: string | number | boolean | null): void {
    this.form.recordType = typeof value === 'string' ? value : 'General';
  }

  saveRecord(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const editingId = this.editingId;
    const isEditing = !!editingId;
    const selectedFiles = isEditing ? [...this.selectedAttachmentFilesForEdit] : [...this.selectedAttachmentFilesForCreate];
    const request = editingId
      ? this.apiService.put<ApiResponse<HealthRecord>>(`/health-records/${editingId}`, this.form)
      : this.apiService.post<ApiResponse<HealthRecord>>(`/pets/${this.petId}/health-records`, this.form);

    request.subscribe({
      next: (response) => {
        const savedRecordId = editingId || response.data?.id;
        if (!selectedFiles.length) {
          this.finishRecordSave(isEditing);
          return;
        }
        if (!savedRecordId) {
          this.finishRecordSave(isEditing, 'files.uploadAfterSaveWarning');
          return;
        }
        const uploads = selectedFiles.map((file) => this.apiService.uploadHealthRecordAttachment<ApiResponse<FileAsset>>(savedRecordId, file).pipe(catchError(() => of(null))));
        forkJoin(uploads).subscribe((results) => this.finishRecordSave(isEditing, results.some((result) => result === null) ? 'files.uploadAfterSaveWarning' : ''));
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'Unable to save health record.';
        this.isSaving = false;
      }
    });
  }

  editRecord(record: HealthRecord): void {
    this.clearAttachmentSelection();
    this.editingId = record.id;
    this.form = {
      recordType: this.normalizedType(record.recordType), title: record.title || '', description: record.description || '',
      recordDate: this.toDateInput(record.recordDate), nextDueDate: this.toDateInput(record.nextDueDate),
      vetClinicName: record.vetClinicName || '', vetName: record.vetName || '', dosage: record.dosage || '', frequency: record.frequency || '',
      vaccineName: record.vaccineName || '', vaccineManufacturer: record.vaccineManufacturer || '', vaccineBatchNumber: record.vaccineBatchNumber || '',
      medicationName: record.medicationName || '', doseAmount: record.doseAmount ?? null, doseUnit: record.doseUnit || '', administrationRoute: record.administrationRoute || '',
      preventiveCareType: record.preventiveCareType || '', visitReason: record.visitReason || '', visitOutcome: record.visitOutcome || '',
      measurementType: record.measurementType || '', measurementValue: record.measurementValue ?? null, measurementUnit: record.measurementUnit || '',
      reminderRequired: !!record.reminderRequired
    };
    if (!this.attachments[record.id] && !this.loadingAttachmentRecordIds.has(record.id)) this.loadAttachments(record.id);
  }

  deleteRecord(record: HealthRecord): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.delete<ApiResponse<unknown>>(`/health-records/${record.id}`).subscribe({
      next: () => { this.successMessage = 'Health record deleted.'; this.loadPage(); },
      error: () => { this.errorMessage = 'Unable to delete health record.'; }
    });
  }

  recordDetails(record: HealthRecord): string[] {
    const details: string[] = [];
    if (record.vaccineName) details.push(`Vaccine: ${record.vaccineName}`);
    if (record.medicationName) details.push(`Medication: ${record.medicationName}`);
    if (record.preventiveCareType) details.push(`Preventive care: ${record.preventiveCareType}`);
    if (record.measurementType && record.measurementValue !== null && record.measurementValue !== undefined) details.push(`${record.measurementType}: ${record.measurementValue} ${record.measurementUnit || ''}`.trim());
    if (record.visitReason) details.push(`Visit: ${record.visitReason}`);
    return details;
  }

  loadAttachments(recordId: string): void {
    this.loadingAttachmentRecordIds.add(recordId);
    this.attachmentErrors[recordId] = '';
    this.apiService.getHealthRecordAttachments<ApiResponse<FileAsset[]>>(recordId).subscribe({
      next: (response) => { this.attachments[recordId] = response.data || []; },
      error: () => { this.attachmentErrors[recordId] = 'files.loadFailed'; this.loadingAttachmentRecordIds.delete(recordId); },
      complete: () => { this.loadingAttachmentRecordIds.delete(recordId); }
    });
  }

  onAttachmentFilesChange(files: File[]): void {
    if (this.editingId) this.selectedAttachmentFilesForEdit = [...files];
    else this.selectedAttachmentFilesForCreate = [...files];
  }

  deleteAttachment(record: HealthRecord, attachment: FileAsset): void {
    this.deletingAttachmentIds.add(attachment.id);
    this.attachmentErrors[record.id] = '';
    this.successMessage = '';
    this.apiService.deleteHealthRecordAttachment<ApiResponse<unknown>>(record.id, attachment.id).subscribe({
      next: () => { this.successMessage = 'files.deleteSuccess'; this.loadAttachments(record.id); },
      error: () => { this.attachmentErrors[record.id] = 'files.deleteFailed'; this.deletingAttachmentIds.delete(attachment.id); },
      complete: () => { this.deletingAttachmentIds.delete(attachment.id); }
    });
  }

  downloadAttachment(record: HealthRecord, attachment: FileAsset): void {
    this.attachmentErrors[record.id] = '';
    this.apiService.downloadHealthRecordAttachment(record.id, attachment.id).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = attachment.originalFileName;
        link.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: () => { this.attachmentErrors[record.id] = 'files.downloadFailed'; }
    });
  }

  attachmentTypeKey(attachment: FileAsset): string { return attachment.contentType === 'application/pdf' ? 'files.pdf' : 'files.image'; }
  attachmentSize(attachment: FileAsset): number { const kb = attachment.sizeBytes / 1024; return kb >= 1024 ? kb / 1024 : kb; }
  attachmentSizeUnitKey(attachment: FileAsset): string { return attachment.sizeBytes >= 1024 * 1024 ? 'files.megabytes' : 'files.kilobytes'; }

  resetForm(): void {
    this.editingId = null;
    this.form = newEmptyForm();
    this.clearAttachmentSelection();
  }

  private finishRecordSave(isEditing: boolean, uploadErrorKey = ''): void {
    this.isSaving = false;
    this.resetForm();
    this.successMessage = isEditing ? 'Health record updated.' : 'Health record created.';
    this.loadPage();
    this.errorMessage = uploadErrorKey;
  }

  private clearAttachmentSelection(): void {
    this.selectedAttachmentFilesForCreate = [];
    this.selectedAttachmentFilesForEdit = [];
    this.attachmentUpload?.clearSelection();
  }

  private normalizedType(value?: string): string {
    const normalized = (value || '').toLowerCase();
    if (normalized === 'checkup' || normalized === 'surgery' || normalized === 'vet visit') return 'VetVisit';
    if (normalized === 'other' || normalized === 'allergy' || !normalized) return 'General';
    return value || 'General';
  }

  private toDateInput(value?: string | null): string { return value ? value.substring(0, 10) : ''; }
}
