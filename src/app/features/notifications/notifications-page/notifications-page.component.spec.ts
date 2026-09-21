import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { InAppNotification } from '../../../core/models/marketplace.models';
import { NotificationsPageComponent } from './notifications-page.component';

describe('NotificationsPageComponent Provider approval workflow', () => {
  let component: NotificationsPageComponent;
  let http: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let dispatchSpy: jasmine.Spy;
  let i18n: { currentLanguage: string; translate: (value: string) => string };

  const notification = (overrides: Partial<InAppNotification> = {}): InAppNotification => ({
    id: 'notification-1',
    type: 'ProviderApprovalRequested',
    title: 'New provider',
    message: 'A provider registered.',
    actionPath: '/admin/users?role=Provider&status=Pending',
    isRead: false,
    createdAt: '2026-09-21T00:00:00Z',
    ...overrides
  });

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    router.navigate.and.returnValue(Promise.resolve(true));
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    i18n = {
      currentLanguage: 'en',
      translate: (value: string) => `translated:${value}`
    };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiService,
        NotificationsPageComponent,
        { provide: Router, useValue: router },
        { provide: I18nService, useValue: i18n }
      ]
    });
    component = TestBed.inject(NotificationsPageComponent);
    http = TestBed.inject(HttpTestingController);
    dispatchSpy = spyOn(window, 'dispatchEvent').and.callThrough();
  });

  afterEach(() => http.verify());

  it('provides the Provider approval title, type, icon state, and action', () => {
    const item = notification({ actionPath: null });

    expect(component.isProviderApprovalRequest(item)).toBeTrue();
    expect(component.localizedType(item)).toBe('translated:notifications.type.providerApprovalRequested');
    expect(component.localizedTitle(item)).toBe('translated:notifications.providerApprovalTitle');
    expect(component.localizedMessage(item)).toBe('translated:notifications.providerApprovalMessage');
    expect(component.hasAction(item)).toBeTrue();
  });

  it('marks the notification read, updates unread count, keeps the technical event, and navigates to Pending Providers', () => {
    const item = notification();
    component.notifications = [item];
    expect(component.unreadCount).toBe(1);

    component.markRead(item, true);
    const request = http.expectOne((entry) => entry.url.endsWith('/notifications/notification-1/read'));
    request.flush({ success: true, data: { ...item, isRead: true, readAt: '2026-09-21T01:00:00Z' } });

    expect(component.unreadCount).toBe(0);
    expect(dispatchSpy.calls.mostRecent().args[0].type).toBe('petlife:notifications-changed');
    expect(router.navigate).toHaveBeenCalledWith(['/admin/users'], {
      queryParams: { role: 'Provider', status: 'Pending' }
    });
  });

  it('keeps existing action-path navigation for other notification types', () => {
    const item = notification({ type: 'ReminderDue', actionPath: '/reminders', isRead: true });

    component.markRead(item, true);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/reminders');
    expect(http.match(() => true).length).toBe(0);
  });

  it('displays the Pet Lovers brand for incoming pet transfer notifications', () => {
    const item = notification({
      type: 'PetOwnershipTransferredIn',
      message: 'Milo is now available in your PetLife profile.'
    });

    expect(component.localizedMessage(item)).toBe('Milo is now available in your Pet Lovers profile.');

    i18n.currentLanguage = 'fa';
    expect(component.localizedMessage(item)).toBe('Milo اکنون در پروفایل Pet Lovers شما در دسترس است.');
  });

  it('maps mark-as-read API failures to the page error state', () => {
    const item = notification();
    component.markRead(item);

    http.expectOne((entry) => entry.url.endsWith('/notifications/notification-1/read'))
      .flush({ message: 'Unable to update notification.' }, { status: 500, statusText: 'Server Error' });

    expect(component.errorMessage).toBe('Unable to update notification.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
