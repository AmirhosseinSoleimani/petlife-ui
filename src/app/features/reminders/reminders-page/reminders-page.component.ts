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

  constructor(private readonly apiService: ApiService) {}

  get petOptions(): AppInputOption[] {
    return this.pets.map((pet) => ({
      label: pet.petName,
      value: pet.id
    }));
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
        this.errorMessage = 'Unable to load pets.';
      }
    });
  }

  loadReminders(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<Reminder[]>>('/reminders/upcoming').subscribe({
      next: (response) => {
        this.reminders = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load reminders.';
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
        this.form = { petId: null, title: '', dueDate: '', reminderType: '', description: '' };
        this.successMessage = 'Reminder created.';
        this.loadReminders();
      },
      error: () => {
        this.errorMessage = 'Unable to create reminder.';
        this.isSaving = false;
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  markDone(reminder: Reminder): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.post<ApiResponse<unknown>>(`/reminders/${reminder.id}/done`, {}).subscribe({
      next: () => {
        this.successMessage = 'Reminder marked done.';
        this.loadReminders();
      },
      error: () => {
        this.errorMessage = 'Unable to mark reminder done.';
      }
    });
  }

  snooze(reminder: Reminder): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.post<ApiResponse<unknown>>(`/reminders/${reminder.id}/snooze`, { snoozeUntil: this.getTomorrowDate() }).subscribe({
      next: () => {
        this.successMessage = 'Reminder snoozed until tomorrow.';
        this.loadReminders();
      },
      error: () => {
        this.errorMessage = 'Unable to snooze reminder.';
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

    return dueDate <= today ? 'Due now' : 'Upcoming';
  }

  getPriorityTone(reminder: Reminder): 'success' | 'warning' | 'info' {
    const label = this.getPriorityLabel(reminder);

    if (label === 'Done') {
      return 'success';
    }

    return label === 'Due now' ? 'warning' : 'info';
  }

  private getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().substring(0, 10);
  }
}
