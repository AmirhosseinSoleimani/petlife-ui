import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet, Reminder, ReminderPayload } from '../../../core/models/customer-core.models';
import { RECURRENCE_TYPES, ReminderTemplate } from '../../../core/models/phase1-care.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';
import { AppDialogService } from '../../../shared/services/app-dialog.service';

interface ExpiryForm {
  petId: string | null;
  title: string;
  description: string;
  expiryDate: string;
  reminderLeadDays: number;
}

/** Local calendar-day values avoid UTC midnight changing the displayed day. */
export function reminderLocalDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateAfterDue(due: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return '';
  const candidate = new Date(`${due}T12:00:00`);
  if (Number.isNaN(candidate.getTime())) return '';
  candidate.setDate(candidate.getDate() + 1);
  return reminderLocalDate(candidate);
}

export function recurrenceEndsAfterDue(due: string, end: string | null | undefined): boolean {
  return !end || !!dateAfterDue(due) && end > due;
}

@Component({
  selector: 'app-reminders-page',
  templateUrl: './reminders-page.component.html',
  styleUrls: ['./reminders-page.component.scss']
})
export class RemindersPageComponent implements OnInit {
  readonly reminderTypeOptions = ['Vaccination', 'Medication', 'Checkup', 'ParasiteControl', 'Grooming', 'Environment', 'Feeding', 'Purchase', 'Appointment', 'Other'];
  readonly recurrenceTypes = RECURRENCE_TYPES;
  readonly buckets = ['all', 'today', 'overdue', 'upcoming', 'done'];
  pets: Pet[] = [];
  reminders: Reminder[] = [];
  templates: ReminderTemplate[] = [];
  selectedIds = new Set<string>();
  bucket = 'all';
  petFilter = '';
  typeFilter = '';
  form: ReminderPayload = this.emptyForm();
  expiryForm: ExpiryForm = this.emptyExpiryForm();
  editingId: string | null = null;
  editorMode: 'reminder' | 'expiry' = 'reminder';
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  isReminderEditorOpen = false;
  loadFailed = false;
  petsLoadFailed = false;
  templatesLoadFailed = false;

  constructor(private readonly apiService: ApiService, private readonly dialogService: AppDialogService) {}

  get petOptions(): AppInputOption[] {
    return this.pets.map(pet => ({ label: pet.petName, value: pet.id }));
  }

  get filterPetOptions(): AppInputOption[] {
    return [{ label: 'reminders.allPets', value: '' }, ...this.petOptions];
  }

  get typeFilterOptions(): AppInputOption[] {
    return [{ label: 'reminders.allTypes', value: '' }, ...this.reminderTypeOptions.map(value => ({ label: value, value }))];
  }

  get templateOptions(): AppInputOption[] {
    return [{ label: 'reminders.noTemplate', value: null }, ...this.templates.map(item => ({ label: item.name, value: item.id }))];
  }

  get recurrenceEndMin(): string {
    return dateAfterDue(this.form.dueDate || '');
  }

  get recurrenceEndInvalid(): boolean {
    return this.form.recurrenceType !== 'None' &&
      !recurrenceEndsAfterDue(this.form.dueDate || '', this.form.recurrenceEndDate);
  }

  get expiryNoticeDate(): string {
    if (!this.expiryForm.expiryDate) return '';
    const date = new Date(`${this.expiryForm.expiryDate}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    date.setDate(date.getDate() - Number(this.expiryForm.reminderLeadDays || 0));
    return reminderLocalDate(date);
  }

  get hasSelection(): boolean { return this.selectedIds.size > 0; }

  get hasFilters(): boolean { return !!(this.petFilter || this.typeFilter); }

  clearFilters(): void {
    this.petFilter = '';
    this.typeFilter = '';
    this.loadReminders();
  }


  ngOnInit(): void {
    this.loadPets();
    this.loadReminders();
  }

  loadPets(): void {
    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: response => {
        if (!response?.success || !Array.isArray(response.data)) {
          this.petsLoadFailed = true;
          this.errorMessage = 'reminders.loadPetsError';
          return;
        }
        this.petsLoadFailed = false;
        this.pets = response.data;
      },
      error: () => { this.petsLoadFailed = true; this.errorMessage = 'reminders.loadPetsError'; }
    });
  }

  loadReminders(): void {
    this.isLoading = true;
    this.loadFailed = false;
    this.errorMessage = '';
    const params = [`bucket=${this.bucket}`, `utcOffsetMinutes=${this.utcOffsetMinutes()}`];
    if (this.petFilter) params.push(`petId=${encodeURIComponent(this.petFilter)}`);
    if (this.typeFilter) params.push(`reminderType=${encodeURIComponent(this.typeFilter)}`);
    this.apiService.get<ApiResponse<Reminder[]>>(`/v1/reminders/center?${params.join('&')}`).subscribe({
      next: response => {
        if (!response?.success || !Array.isArray(response.data)) {
          this.loadFailed = true;
          this.errorMessage = 'reminders.loadError';
          this.isLoading = false;
          return;
        }
        this.reminders = response.data;
        this.selectedIds.clear();
        this.loadFailed = false;
        this.isLoading = false;
      },
      error: () => {
        this.loadFailed = true;
        this.errorMessage = 'reminders.loadError';
        this.isLoading = false;
      }
    });
  }

  selectBucket(bucket: string): void { this.bucket = bucket; this.loadReminders(); }

  onPetFormChange(petId: string | null): void {
    if (petId !== this.form.petId) this.form.templateId = null;
    this.form.petId = petId;
    this.templates = [];
    this.templatesLoadFailed = false;
    const pet = this.pets.find(item => item.id === petId);
    const species = pet?.speciesId ? `?speciesId=${pet.speciesId}` : '';
    this.apiService.get<ApiResponse<ReminderTemplate[]>>(`/v1/reminders/templates${species}`).subscribe({
      next: response => {
        this.templatesLoadFailed = !response?.success || !Array.isArray(response.data);
        this.templates = this.templatesLoadFailed ? [] : response.data;
      },
      error: () => { this.templates = []; this.templatesLoadFailed = true; }
    });
  }

  onTemplateChange(templateId: string | null): void {
    this.form.templateId = templateId;
    const template = this.templates.find(item => item.id === templateId);
    if (!template) return;
    this.form.reminderType = template.reminderType;
    this.form.title = template.defaultTitle;
    this.form.description = template.defaultDescription || '';
    this.form.recurrenceType = template.defaultRecurrenceType || 'None';
    this.form.recurrenceInterval = template.defaultRecurrenceInterval || 1;
    if (template.suggestedOffsetDays !== null && template.suggestedOffsetDays !== undefined && !this.form.dueDate) {
      const due = new Date();
      due.setDate(due.getDate() + template.suggestedOffsetDays);
      this.form.dueDate = this.localDate(due);
    }
  }

  openCalendar(input: HTMLInputElement): void {
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    try {
      if (typeof picker.showPicker === 'function') {
        picker.showPicker();
        return;
      }
    } catch { /* Browser restricts programmatic pickers; fall back to native focus. */ }
    input.focus();
    input.click();
  }

  changeDueDate(value: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    this.form.dueDate = value;
    if (this.form.recurrenceEndDate && this.form.recurrenceEndDate <= value) {
      this.form.recurrenceEndDate = null;
    }
  }

  changeRecurrenceEndDate(value: string): void {
    if (!value) {
      this.form.recurrenceEndDate = null;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value > (this.form.dueDate || '')) {
      this.form.recurrenceEndDate = value;
    }
  }

  changeExpiryDate(value: string): void {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) this.expiryForm.expiryDate = value;
  }

  saveReminder(): void {
    if (this.isSaving) return;
    if (!this.form.petId) { this.errorMessage = 'reminders.petRequired'; return; }
    if (!this.form.dueDate) { this.errorMessage = 'reminders.dueDateRequired'; return; }
    if (this.recurrenceEndInvalid) { this.errorMessage = 'reminders.endMustFollowDue'; return; }
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const payload = { ...this.form, recurrenceEndDate: this.form.recurrenceType === 'None'
      ? null : (this.form.recurrenceEndDate || null), notificationChannel: 'InApp' };
    const request = this.editingId
      ? this.apiService.put<ApiResponse<Reminder>>(`/v1/reminders/${this.editingId}`, payload)
      : this.apiService.post<ApiResponse<Reminder>>('/v1/reminders', payload);
    request.subscribe({
      next: response => {
        if (!response?.success || !response.data) { this.errorMessage = 'reminders.createError'; this.isSaving = false; return; }
        this.successMessage = this.editingId ? 'reminders.updateSuccess' : 'reminders.createSuccess';
        this.closeReminderEditor(true);
        this.bucket = 'all';
        this.petFilter = '';
        this.typeFilter = '';
        this.loadReminders();
      },
      error: () => { this.errorMessage = this.editingId ? 'reminders.updateError' : 'reminders.createError'; this.isSaving = false; }
    });
  }

  createExpiryReminder(): void {
    if (this.isSaving) return;
    if (!this.expiryForm.petId) { this.errorMessage = 'reminders.petRequired'; return; }
    if (!this.expiryForm.expiryDate) { this.errorMessage = 'reminders.expiryDateRequired'; return; }
    this.isSaving = true;
    this.errorMessage = '';
    this.apiService.post<ApiResponse<Reminder>>('/v1/reminders/expiry', {
      petId: this.expiryForm.petId,
      sourceType: 'Pet',
      sourceId: this.expiryForm.petId,
      title: this.expiryForm.title,
      description: this.expiryForm.description || null,
      expiryDate: this.expiryForm.expiryDate,
      reminderLeadDays: Number(this.expiryForm.reminderLeadDays),
      notificationChannel: 'InApp'
    }).subscribe({
      next: response => { if (!response?.success || !response.data) { this.errorMessage = 'reminders.expiryCreateError'; this.isSaving = false; return; } this.successMessage = 'reminders.expiryCreated'; this.closeReminderEditor(true); this.bucket = 'all'; this.petFilter = ''; this.typeFilter = ''; this.loadReminders(); },
      error: () => { this.errorMessage = 'reminders.expiryCreateError'; this.isSaving = false; }
    });
  }

  openReminderEditor(): void {
    this.editingId = null;
    this.editorMode = 'reminder';
    this.form = this.emptyForm();
    this.templates = [];
    this.errorMessage = '';
    this.isReminderEditorOpen = true;
  }

  openExpiryEditor(): void {
    this.editingId = null;
    this.editorMode = 'expiry';
    this.expiryForm = this.emptyExpiryForm();
    this.errorMessage = '';
    this.isReminderEditorOpen = true;
  }

  editReminder(reminder: Reminder): void {
    if (reminder.isExpiryReminder) return;
    this.editingId = reminder.id;
    this.editorMode = 'reminder';
    this.form = {
      petId: reminder.petId || null,
      templateId: reminder.templateId || null,
      title: reminder.title,
      reminderType: reminder.reminderType || 'Other',
      dueDate: reminder.dueDate ? reminder.dueDate.substring(0, 10) : reminderLocalDate(),
      description: reminder.description || '',
      recurrenceType: reminder.recurrenceType || 'None',
      recurrenceInterval: reminder.recurrenceInterval || 1,
      recurrenceEndDate: reminder.recurrenceEndDate?.substring(0, 10) || null,
      notificationChannel: 'InApp'
    };
    this.onPetFormChange(this.form.petId);
    this.isReminderEditorOpen = true;
  }

  closeReminderEditor(force = false): void {
    if (this.isSaving && !force) return;
    this.isSaving = false;
    this.isReminderEditorOpen = false;
    this.editingId = null;
    this.form = this.emptyForm();
    this.expiryForm = this.emptyExpiryForm();
  }

  getPetName(reminder: Reminder): string { return this.pets.find(pet => pet.id === reminder.petId)?.petName || ''; }

  toggleSelection(reminderId: string, checked: boolean): void { checked ? this.selectedIds.add(reminderId) : this.selectedIds.delete(reminderId); }
  isSelected(reminderId: string): boolean { return this.selectedIds.has(reminderId); }

  bulkDone(): void {
    if (!this.hasSelection) return;
    this.apiService.post<ApiResponse<Reminder[]>>(`/v1/reminders/bulk/done?utcOffsetMinutes=${this.utcOffsetMinutes()}`, { reminderIds: Array.from(this.selectedIds) }).subscribe({
      next: response => { if (!response?.success) { this.errorMessage = 'reminders.bulkError'; return; } this.successMessage = 'reminders.bulkDoneSuccess'; this.loadReminders(); },
      error: () => this.errorMessage = 'reminders.bulkError'
    });
  }

  bulkSnooze(): void {
    if (!this.hasSelection) return;
    this.apiService.post<ApiResponse<Reminder[]>>(`/v1/reminders/bulk/snooze?utcOffsetMinutes=${this.utcOffsetMinutes()}`, { reminderIds: Array.from(this.selectedIds), snoozeUntil: this.getTomorrowDate() }).subscribe({
      next: response => { if (!response?.success) { this.errorMessage = 'reminders.bulkError'; return; } this.successMessage = 'reminders.bulkSnoozeSuccess'; this.loadReminders(); },
      error: () => this.errorMessage = 'reminders.bulkError'
    });
  }

  markDone(reminder: Reminder): void {
    this.apiService.post<ApiResponse<Reminder>>(`/v1/reminders/${reminder.id}/done?utcOffsetMinutes=${this.utcOffsetMinutes()}`, {}).subscribe({
      next: response => { if (!response?.success) { this.errorMessage = 'reminders.doneError'; return; } this.successMessage = 'reminders.doneSuccess'; this.loadReminders(); },
      error: () => this.errorMessage = 'reminders.doneError'
    });
  }

  snooze(reminder: Reminder): void {
    this.apiService.post<ApiResponse<Reminder>>(`/v1/reminders/${reminder.id}/snooze?utcOffsetMinutes=${this.utcOffsetMinutes()}`, { snoozeUntil: this.getTomorrowDate() }).subscribe({
      next: response => { if (!response?.success) { this.errorMessage = 'reminders.snoozeError'; return; } this.successMessage = 'reminders.snoozeSuccess'; this.loadReminders(); },
      error: () => this.errorMessage = 'reminders.snoozeError'
    });
  }

  deleteReminder(reminder: Reminder): void {
    this.dialogService.confirm({ title: 'Delete reminder?', message: 'reminders.deleteConfirm', confirmLabel: 'Delete reminder', tone: 'danger' }).then((confirmed) => {
      if (!confirmed) return;
      this.apiService.delete<ApiResponse<unknown>>(`/v1/reminders/${reminder.id}`).subscribe({
        next: response => { if (!response?.success) { this.errorMessage = 'reminders.deleteError'; return; } this.successMessage = 'reminders.deleteSuccess'; this.loadReminders(); },
        error: () => this.errorMessage = 'reminders.deleteError'
      });
    });
  }

  tone(reminder: Reminder): 'success' | 'warning' | 'info' {
    const state = (reminder.computedState || reminder.status || '').toLowerCase();
    if (state === 'done') return 'success';
    if (state === 'overdue' || state === 'today') return 'warning';
    return 'info';
  }

  private emptyForm(): ReminderPayload {
    return { petId: null, templateId: null, title: '', dueDate: reminderLocalDate(), reminderType: 'Other', description: '', recurrenceType: 'None', recurrenceInterval: 1, recurrenceEndDate: null, notificationChannel: 'InApp' };
  }

  private emptyExpiryForm(): ExpiryForm { return { petId: null, title: '', description: '', expiryDate: '', reminderLeadDays: 30 }; }
  private getTomorrowDate(): string { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); return reminderLocalDate(tomorrow); }
  private utcOffsetMinutes(): number { return -new Date().getTimezoneOffset(); }

  private localDate(value: Date): string { return reminderLocalDate(value); }
}
