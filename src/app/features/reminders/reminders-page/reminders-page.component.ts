import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet, Reminder, ReminderPayload } from '../../../core/models/customer-core.models';
import { RECURRENCE_TYPES, ReminderTemplate } from '../../../core/models/phase1-care.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

interface ExpiryForm {
  petId: string | null;
  title: string;
  description: string;
  expiryDate: string;
  reminderLeadDays: number;
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

  constructor(private readonly apiService: ApiService, private readonly i18nService: I18nService) {}

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

  get hasSelection(): boolean { return this.selectedIds.size > 0; }

  ngOnInit(): void {
    this.loadPets();
    this.loadReminders();
  }

  loadPets(): void {
    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: response => this.pets = response.data || [],
      error: () => this.errorMessage = 'reminders.loadPetsError'
    });
  }

  loadReminders(): void {
    this.isLoading = true;
    this.loadFailed = false;
    this.errorMessage = '';
    const params = [`bucket=${this.bucket}`, `utcOffsetMinutes=${this.utcOffsetMinutes()}`];
    if (this.petFilter) params.push(`petId=${encodeURIComponent(this.petFilter)}`);
    if (this.typeFilter) params.push(`reminderType=${encodeURIComponent(this.typeFilter)}`);
    this.apiService.get<ApiResponse<Reminder[]>>(`/reminders/center?${params.join('&')}`).subscribe({
      next: response => {
        this.reminders = response.data || [];
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
    this.form.petId = petId;
    const pet = this.pets.find(item => item.id === petId);
    const species = pet?.speciesId ? `?speciesId=${pet.speciesId}` : '';
    this.apiService.get<ApiResponse<ReminderTemplate[]>>(`/reminder-templates${species}`).subscribe({
      next: response => this.templates = response.data || [],
      error: () => this.templates = []
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

  saveReminder(): void {
    if (!this.form.petId) { this.errorMessage = 'reminders.petRequired'; return; }
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const payload = { ...this.form, recurrenceEndDate: this.form.recurrenceEndDate || null, notificationChannel: 'InApp' };
    const request = this.editingId
      ? this.apiService.put<ApiResponse<Reminder>>(`/reminders/${this.editingId}`, payload)
      : this.apiService.post<ApiResponse<Reminder>>('/reminders', payload);
    request.subscribe({
      next: () => {
        this.successMessage = this.editingId ? 'reminders.updateSuccess' : 'reminders.createSuccess';
        this.closeReminderEditor(true);
        this.loadReminders();
      },
      error: () => { this.errorMessage = this.editingId ? 'reminders.updateError' : 'reminders.createError'; this.isSaving = false; }
    });
  }

  createExpiryReminder(): void {
    if (!this.expiryForm.petId) { this.errorMessage = 'reminders.petRequired'; return; }
    this.isSaving = true;
    this.errorMessage = '';
    this.apiService.post<ApiResponse<Reminder>>('/reminders/expiry', {
      petId: this.expiryForm.petId,
      sourceType: 'Pet',
      sourceId: this.expiryForm.petId,
      title: this.expiryForm.title,
      description: this.expiryForm.description || null,
      expiryDate: this.expiryForm.expiryDate,
      reminderLeadDays: Number(this.expiryForm.reminderLeadDays),
      notificationChannel: 'InApp'
    }).subscribe({
      next: () => { this.successMessage = 'reminders.expiryCreated'; this.closeReminderEditor(true); this.loadReminders(); },
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
      dueDate: reminder.dueDate ? reminder.dueDate.substring(0, 10) : '',
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
    this.apiService.post<ApiResponse<Reminder[]>>(`/reminders/bulk/done?utcOffsetMinutes=${this.utcOffsetMinutes()}`, { reminderIds: Array.from(this.selectedIds) }).subscribe({
      next: () => { this.successMessage = 'reminders.bulkDoneSuccess'; this.loadReminders(); },
      error: () => this.errorMessage = 'reminders.bulkError'
    });
  }

  bulkSnooze(): void {
    if (!this.hasSelection) return;
    this.apiService.post<ApiResponse<Reminder[]>>(`/reminders/bulk/snooze?utcOffsetMinutes=${this.utcOffsetMinutes()}`, { reminderIds: Array.from(this.selectedIds), snoozeUntil: this.getTomorrowDate() }).subscribe({
      next: () => { this.successMessage = 'reminders.bulkSnoozeSuccess'; this.loadReminders(); },
      error: () => this.errorMessage = 'reminders.bulkError'
    });
  }

  markDone(reminder: Reminder): void {
    this.apiService.post<ApiResponse<Reminder>>(`/reminders/${reminder.id}/done?utcOffsetMinutes=${this.utcOffsetMinutes()}`, {}).subscribe({
      next: () => { this.successMessage = 'reminders.doneSuccess'; this.loadReminders(); },
      error: () => this.errorMessage = 'reminders.doneError'
    });
  }

  snooze(reminder: Reminder): void {
    this.apiService.post<ApiResponse<Reminder>>(`/reminders/${reminder.id}/snooze?utcOffsetMinutes=${this.utcOffsetMinutes()}`, { snoozeUntil: this.getTomorrowDate() }).subscribe({
      next: () => { this.successMessage = 'reminders.snoozeSuccess'; this.loadReminders(); },
      error: () => this.errorMessage = 'reminders.snoozeError'
    });
  }

  deleteReminder(reminder: Reminder): void {
    if (!window.confirm(this.i18nService.translate('reminders.deleteConfirm'))) return;
    this.apiService.delete<ApiResponse<unknown>>(`/reminders/${reminder.id}`).subscribe({
      next: () => { this.successMessage = 'reminders.deleteSuccess'; this.loadReminders(); },
      error: () => this.errorMessage = 'reminders.deleteError'
    });
  }

  tone(reminder: Reminder): 'success' | 'warning' | 'info' {
    const state = (reminder.computedState || reminder.status || '').toLowerCase();
    if (state === 'done') return 'success';
    if (state === 'overdue' || state === 'today') return 'warning';
    return 'info';
  }

  private emptyForm(): ReminderPayload {
    return { petId: null, templateId: null, title: '', dueDate: '', reminderType: 'Other', description: '', recurrenceType: 'None', recurrenceInterval: 1, recurrenceEndDate: null, notificationChannel: 'InApp' };
  }

  private emptyExpiryForm(): ExpiryForm { return { petId: null, title: '', description: '', expiryDate: '', reminderLeadDays: 30 }; }
  private getTomorrowDate(): string { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); return this.localDate(tomorrow); }
  private utcOffsetMinutes(): number { return -new Date().getTimezoneOffset(); }

  private localDate(value: Date): string { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
}
