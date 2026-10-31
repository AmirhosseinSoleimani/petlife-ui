import { of } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import { AppDialogService } from '../../../shared/services/app-dialog.service';
import {
  RemindersPageComponent, reminderLocalDate, dateAfterDue, recurrenceEndsAfterDue
} from './reminders-page.component';

describe('Reminder calendar and creation', () => {
  function setup() {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put']);
    const dialogs = jasmine.createSpyObj<AppDialogService>('AppDialogService', ['confirm']);
    return { api, component: new RemindersPageComponent(api, dialogs) };
  }

  it('defaults new reminders to the local calendar date', () => {
    expect(reminderLocalDate(new Date(2026, 9, 30, 23, 55))).toBe('2026-10-30');
    const { component } = setup();
    component.openReminderEditor();
    expect(component.form.dueDate).toBe(reminderLocalDate());
    component.closeReminderEditor();
    expect(component.form.dueDate).toBe(reminderLocalDate());
  });

  it('requires recurrence end to be strictly after the due date', () => {
    expect(dateAfterDue('2026-10-31')).toBe('2026-11-01');
    expect(recurrenceEndsAfterDue('2026-10-31', '2026-10-31')).toBeFalse();
    expect(recurrenceEndsAfterDue('2026-10-31', '2026-10-30')).toBeFalse();
    expect(recurrenceEndsAfterDue('2026-10-31', '2026-11-01')).toBeTrue();
    const { component } = setup();
    component.form.dueDate = '2026-10-31';
    component.form.recurrenceType = 'Weekly';
    component.form.recurrenceEndDate = '2026-11-12';
    component.changeDueDate('2026-11-15');
    expect(component.form.recurrenceEndDate).toBeNull();
    expect(component.recurrenceEndMin).toBe('2026-11-16');
  });

  it('does not send an invalid recurrence end date to the server', () => {
    const { api, component } = setup();
    component.form.petId = 'a8b3ac12-c456-45aa-b370-34ad213ad197';
    component.form.title = 'Booster';
    component.form.dueDate = '2026-11-10';
    component.form.recurrenceType = 'Monthly';
    component.form.recurrenceEndDate = '2026-11-09';
    component.saveReminder();
    expect(component.errorMessage).toBe('reminders.endMustFollowDue');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('preserves editing templates when the pet is unchanged and hides empty templates', () => {
    const { api, component } = setup();
    component.form.petId = 'a8b3ac12-c456-45aa-b370-34ad213ad197';
    component.form.templateId = 'd171c274-cf6a-4a4d-a648-73a5687b2144';
    api.get.and.returnValue(of({ success: true, data: [] }));
    component.onPetFormChange(component.form.petId);
    expect(component.form.templateId).toBe('d171c274-cf6a-4a4d-a648-73a5687b2144');
    expect(component.templates).toEqual([]);
    component.onPetFormChange('6c850e8c-174b-4a1a-a338-d4ef404b09b8');
    expect(component.form.templateId).toBeNull();
  });

  it('previews the expiry reminder date without changing its actual expiry', () => {
    const { component } = setup();
    component.expiryForm.expiryDate = '2026-12-20';
    component.expiryForm.reminderLeadDays = 14;
    expect(component.expiryNoticeDate).toBe('2026-12-06');
    expect(component.expiryForm.expiryDate).toBe('2026-12-20');
  });
});
