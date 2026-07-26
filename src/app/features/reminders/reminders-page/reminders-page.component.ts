import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Pet, REMINDER_TYPE_OPTIONS, Reminder, ReminderPayload } from '../../../core/models/customer-core.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

@Component({
  selector: 'app-reminders-page',
  templateUrl: './reminders-page.component.html',
  styleUrls: ['./reminders-page.component.scss']
})
export class RemindersPageComponent implements OnInit {
  readonly reminderTypeOptions = REMINDER_TYPE_OPTIONS;
  pets: Pet[] = [];
  reminders: Reminder[] = [];
  form: ReminderPayload = {
    petId: null,
    title: '',
    dueDate: '',
    reminderType: '',
    description: ''
  };
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  isReminderEditorOpen = false;
  loadFailed = false;

  constructor(private readonly apiService: ApiService) {}

  get petOptions(): AppInputOption[] {
    return this.pets.map((pet) => ({
      label: pet.petName,
      value: pet.id
    }));
  }

  get reminderGroups(): Array<{ label: string; empty: string; tone: 'success' | 'warning' | 'info'; items: Reminder[] }> {
    const completed = this.reminders.filter((reminder) => this.isCompleted(reminder));
    const dueSoon = this.reminders.filter((reminder) => !this.isCompleted(reminder) && this.isDueSoon(reminder));
    const upcoming = this.reminders.filter((reminder) => !this.isCompleted(reminder) && !this.isDueSoon(reminder));
    return [
      { label: 'reminders.dueSoon', empty: 'reminders.noDueSoon', tone: 'warning', items: dueSoon },
      { label: 'reminders.upcoming', empty: 'reminders.noUpcomingGroup', tone: 'info', items: upcoming },
      { label: 'reminders.completed', empty: 'reminders.noCompleted', tone: 'success', items: completed }
    ];
  }

  ngOnInit(): void {
    this.loadPets();
    this.loadReminders();
  }

  loadPets(): void {
    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: (response) => {
        this.pets = response.data || [];
      },
      error: () => {
        this.errorMessage = 'reminders.loadPetsError';
      }
    });
  }

  loadReminders(): void {
    this.isLoading = true;
    this.loadFailed = false;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<Reminder[]>>('/reminders/upcoming').subscribe({
      next: (response) => {
        this.reminders = response.data || [];
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

  createReminder(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.post<ApiResponse<Reminder>>('/reminders', this.form).subscribe({
      next: () => {
        this.resetForm();
        this.isReminderEditorOpen = false;
        this.successMessage = 'reminders.createSuccess';
        this.loadReminders();
      },
      error: () => {
        this.errorMessage = 'reminders.createError';
        this.isSaving = false;
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  openReminderEditor(): void {
    this.resetForm();
    this.errorMessage = '';
    this.isReminderEditorOpen = true;
  }

  closeReminderEditor(): void {
    if (this.isSaving) {
      return;
    }
    this.isReminderEditorOpen = false;
    this.resetForm();
  }

  getPetName(reminder: Reminder): string {
    return this.pets.find((pet) => pet.id === reminder.petId)?.petName || '';
  }

  markDone(reminder: Reminder): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.post<ApiResponse<unknown>>(`/reminders/${reminder.id}/done`, {}).subscribe({
      next: () => {
        this.successMessage = 'reminders.doneSuccess';
        this.loadReminders();
      },
      error: () => {
        this.errorMessage = 'reminders.doneError';
      }
    });
  }

  snooze(reminder: Reminder): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.post<ApiResponse<unknown>>(`/reminders/${reminder.id}/snooze`, { snoozeUntil: this.getTomorrowDate() }).subscribe({
      next: () => {
        this.successMessage = 'reminders.snoozeSuccess';
        this.loadReminders();
      },
      error: () => {
        this.errorMessage = 'reminders.snoozeError';
      }
    });
  }

  getPriorityLabel(reminder: Reminder): string {
    const status = (reminder.status || '').toLowerCase();

    if (status.includes('done') || status.includes('complete')) {
      return 'Done';
    }

    if (!reminder.dueDate) {
      return 'Upcoming';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(reminder.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const dueSoon = new Date(today);
    dueSoon.setDate(today.getDate() + 3);
    return dueDate <= dueSoon ? 'Due soon' : 'Upcoming';
  }

  getPriorityTone(reminder: Reminder): 'success' | 'warning' | 'info' {
    const label = this.getPriorityLabel(reminder);

    if (label === 'Done') {
      return 'success';
    }

    return label === 'Due soon' ? 'warning' : 'info';
  }

  private resetForm(): void {
    this.form = { petId: null, title: '', dueDate: '', reminderType: '', description: '' };
  }

  private isCompleted(reminder: Reminder): boolean {
    const status = (reminder.status || '').toLowerCase();
    return status.includes('done') || status.includes('complete');
  }

  private isDueSoon(reminder: Reminder): boolean {
    if (!reminder.dueDate) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threshold = new Date(today);
    threshold.setDate(today.getDate() + 3);
    const dueDate = new Date(reminder.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate <= threshold;
  }

  private getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().substring(0, 10);
  }
}
