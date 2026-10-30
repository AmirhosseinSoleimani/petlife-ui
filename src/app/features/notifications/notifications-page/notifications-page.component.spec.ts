import { of } from 'rxjs';
import { Router } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { InAppNotification } from '../../../core/models/marketplace.models';
import { environment } from '../../../../environments/environment';
import { NotificationsPageComponent } from './notifications-page.component';

describe('Notifications v1 integration', () => {
  const notification: InAppNotification = {
    id: 'fb0dbeec-551b-4e06-9a02-b85d3a9daf84',
    type: 'PetOwnershipTransferredIn',
    title: 'Pet received',
    message: 'You received a pet.',
    actionPath: '/pets',
    isRead: false,
    readAt: null,
    createdAt: '2026-10-30T15:00:00Z'
  };

  let originalEnabled: boolean;

  beforeEach(() => {
    originalEnabled = environment.notificationsApiEnabled;
    environment.notificationsApiEnabled = true;
  });

  afterEach(() => {
    environment.notificationsApiEnabled = originalEnabled;
  });

  function setup() {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    const i18n = jasmine.createSpyObj<I18nService>('I18nService', ['translate']);
    const component = new NotificationsPageComponent(api, router, i18n);
    return { api, router, component };
  }

  it('loads authenticated-user notifications from /v1/notifications', () => {
    const { api, component } = setup();
    api.get.and.returnValue(of({ success: true, data: [notification] }));
    component.ngOnInit();

    expect(api.get).toHaveBeenCalledWith('/v1/notifications?take=100');
    expect(component.notifications).toEqual([notification]);
    expect(component.unreadCount).toBe(1);
    expect(component.errorMessage).toBe('');
  });

  it('uses the unreadOnly filter supported by Notifications v1', () => {
    const { api, component } = setup();
    api.get.and.returnValue(of({ success: true, data: [notification] }));

    component.toggleUnreadOnly();

    expect(component.unreadOnly).toBeTrue();
    expect(api.get).toHaveBeenCalledWith('/v1/notifications?unreadOnly=true&take=100');
  });

  it('marks a notification as read and removes it from the unread-only view', () => {
    const { api, component } = setup();
    const updated = { ...notification, isRead: true, readAt: '2026-10-30T16:00:00Z' };
    component.notifications = [notification];
    component.unreadOnly = true;
    api.post.and.returnValue(of({ success: true, data: updated }));
    const changed = spyOn(window, 'dispatchEvent').and.callThrough();

    component.markRead(notification);

    expect(api.post).toHaveBeenCalledWith(
      '/v1/notifications/fb0dbeec-551b-4e06-9a02-b85d3a9daf84/read', {}
    );
    expect(component.notifications).toEqual([]);
    expect(changed).toHaveBeenCalled();
  });

  it('marks every displayed notification as read using /v1/notifications/read-all', () => {
    const { api, component } = setup();
    component.notifications = [notification];
    api.post.and.returnValue(of({ success: true, data: null }));

    component.markAllRead();

    expect(api.post).toHaveBeenCalledWith('/v1/notifications/read-all', {});
    expect(component.notifications[0].isRead).toBeTrue();
    expect(component.isUpdating).toBeFalse();
  });

  it('keeps Notifications inactive when the configured backend is unavailable', () => {
    const { api, component } = setup();
    environment.notificationsApiEnabled = false;
    component.load();

    expect(api.get).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('notifications.backendNotReady');
  });
});
