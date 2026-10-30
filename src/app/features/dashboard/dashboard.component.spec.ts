import { of } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';

import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Reminder } from '../../core/models/customer-core.models';
import { UserPreferencesService } from '../../core/preferences/user-preferences.service';
import { DashboardComponent, dashboardActiveReminders } from './dashboard.component';

describe('Dashboard care reminders', () => {
  const active: Reminder[] = [
    { id: 'future', title: 'Vet visit', dueDate: '2026-11-10', status: 'Active', computedState: 'Upcoming' },
    { id: 'done', title: 'Completed', dueDate: '2026-10-31', status: 'Done', computedState: 'Done' },
    { id: 'today', title: 'Medication', dueDate: '2026-10-31', status: 'Active', computedState: 'Today' },
    { id: 'overdue', title: 'Vaccine', dueDate: '2026-10-29', status: 'Active', computedState: 'Overdue' }
  ];

  it('shows overdue, today and future reminders but never completed reminders', () => {
    expect(dashboardActiveReminders(active).map(item => item.id)).toEqual([
      'overdue', 'today', 'future'
    ]);
    expect(dashboardActiveReminders(active, 2).map(item => item.id)).toEqual(['overdue', 'today']);
    expect(active.length).toBe(4);
  });

  it('queries the local-time Reminder center rather than UTC-only upcoming', () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);
    auth.getCurrentUser.and.returnValue(null);
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    api.get.and.returnValue(of({ success: true, data: active }));
    const preferences = {} as UserPreferencesService;
    const sanitizer = {} as DomSanitizer;
    const component = new DashboardComponent(auth, api, preferences, sanitizer);

    (component as unknown as { loadReminders(): void }).loadReminders();

    const offset = -new Date().getTimezoneOffset();
    expect(api.get).toHaveBeenCalledWith(
      `/v1/reminders/center?bucket=all&utcOffsetMinutes=${offset}`
    );
    expect(component.upcomingCare.map(item => item.id)).toEqual([
      'overdue', 'today', 'future'
    ]);
    expect(component.activeReminderCount).toBe(3);
  });
});
