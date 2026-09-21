import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { apiErrorMessage } from '../../../core/api/api-error.util';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { InAppNotification } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-notifications-page',
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss']
})
export class NotificationsPageComponent implements OnInit {
  notifications: InAppNotification[] = [];
  unreadOnly = false;
  isLoading = false;
  isUpdating = false;
  errorMessage = '';

  constructor(private readonly api: ApiService, private readonly router: Router, private readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.load();
  }

  get unreadCount(): number {
    return this.notifications.filter((item) => !item.isRead).length;
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const query = this.unreadOnly ? '?unreadOnly=true&take=100' : '?take=100';
    this.api.get<ApiResponse<InAppNotification[]>>(`/notifications${query}`).subscribe({
      next: (response) => {
        this.notifications = response.data || [];
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = apiErrorMessage(error, 'notifications.loadError');
        this.isLoading = false;
      }
    });
  }

  toggleUnreadOnly(): void {
    this.unreadOnly = !this.unreadOnly;
    this.load();
  }

  markRead(item: InAppNotification, navigate = false): void {
    if (item.isRead) {
      if (navigate) this.openAction(item);
      return;
    }

    this.api.post<ApiResponse<InAppNotification>>(`/notifications/${item.id}/read`, {}).subscribe({
      next: (response) => {
        const updated = response.data;
        this.notifications = this.notifications.map((notification) =>
          notification.id === item.id ? (updated || { ...notification, isRead: true, readAt: new Date().toISOString() }) : notification
        );
        window.dispatchEvent(new CustomEvent('petlife:notifications-changed'));
        if (navigate) this.openAction(updated || item);
      },
      error: (error) => this.errorMessage = apiErrorMessage(error, 'notifications.markReadError')
    });
  }

  markAllRead(): void {
    if (!this.unreadCount || this.isUpdating) return;
    this.isUpdating = true;
    this.errorMessage = '';
    this.api.post<ApiResponse<unknown>>('/notifications/read-all', {}).subscribe({
      next: () => {
        const now = new Date().toISOString();
        this.notifications = this.notifications.map((item) => ({ ...item, isRead: true, readAt: item.readAt || now }));
        window.dispatchEvent(new CustomEvent('petlife:notifications-changed'));
      },
      error: (error) => { this.errorMessage = apiErrorMessage(error, 'notifications.markAllError'); this.isUpdating = false; },
      complete: () => this.isUpdating = false
    });
  }

  openAction(item: InAppNotification): void {
    if (!item.actionPath) return;
    const action = item.actionPath.startsWith('/') ? item.actionPath : `/${item.actionPath}`;
    if (/^\/pets\/[^/]+$/.test(action)) {
      this.router.navigate(['/pets']);
      return;
    }
    this.router.navigateByUrl(action);
  }


  localizedType(item: InAppNotification): string {
    if (item.type === 'PetOwnershipTransferredOut' || item.type === 'PetOwnershipTransferredIn') {
      return this.i18n.translate('notifications.type.petTransfer');
    }
    return item.type;
  }

  localizedTitle(item: InAppNotification): string {
    if (this.i18n.currentLanguage !== 'fa') return item.title;
    if (item.type === 'PetOwnershipTransferredOut') return 'انتقال حیوان تکمیل شد';
    if (item.type === 'PetOwnershipTransferredIn') return 'حیوان دریافت شد';
    return this.i18n.translate(item.title);
  }

  localizedMessage(item: InAppNotification): string {
    if (this.i18n.currentLanguage !== 'fa') return item.message;
    if (item.type === 'PetOwnershipTransferredOut') {
      const match = item.message.match(/^(.*?) was transferred to (.*?)\.?$/i);
      if (match) return `${match[1]} به ${match[2]} منتقل شد.`;
    }
    if (item.type === 'PetOwnershipTransferredIn') {
      const match = item.message.match(/^(.*?) is now available in your PetLife profile\.?$/i);
      if (match) return `${match[1]} اکنون در پروفایل Pet Lovers شما در دسترس است.`;
    }
    return this.i18n.translate(item.message);
  }

  notificationIcon(type: string): string {
    const normalized = (type || '').toLowerCase();
    if (normalized.includes('transfer')) return '⇄';
    if (normalized.includes('request')) return '↗';
    if (normalized.includes('reminder')) return '◷';
    return '•';
  }
}
