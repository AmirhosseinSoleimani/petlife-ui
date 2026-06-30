import { Component } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { AppLanguage, I18nService } from '../../../core/i18n/i18n.service';
import { AuthUser } from '../../../core/models/auth.models';

interface NavItem {
  labelKey: string;
  path: string;
  icon: string;
  enabled: boolean;
}

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss']
})
export class AppShellComponent {
  private readonly customerNavItems: NavItem[] = [
    { labelKey: 'nav.dashboard', path: '/dashboard', icon: 'dashboard', enabled: true },
    { labelKey: 'nav.pets', path: '/pets', icon: 'pets', enabled: true },
    { labelKey: 'nav.reminders', path: '/reminders', icon: 'reminders', enabled: true },
    { labelKey: 'nav.providers', path: '/providers', icon: 'providers', enabled: true },
    { labelKey: 'nav.services', path: '/services', icon: 'services', enabled: true },
    { labelKey: 'nav.myRequests', path: '/service-requests/my', icon: 'requests', enabled: true },
    { labelKey: 'nav.emergencyVets', path: '/emergency-vets', icon: 'emergency', enabled: true }
  ];

  private readonly providerNavItems: NavItem[] = [
    { labelKey: 'nav.dashboard', path: '/dashboard', icon: 'dashboard', enabled: true },
    { labelKey: 'nav.providerProfile', path: '/provider/profile', icon: 'providers', enabled: true },
    { labelKey: 'nav.providerServices', path: '/provider/services', icon: 'services', enabled: true },
    { labelKey: 'nav.serviceAreas', path: '/provider/service-areas', icon: 'emergency', enabled: true },
    { labelKey: 'nav.incomingRequests', path: '/provider/requests', icon: 'requests', enabled: true }
  ];
  readonly languageOptions: Array<{ label: string; value: AppLanguage }> = [
    { label: 'English', value: 'en' },
    { label: 'فارسی', value: 'fa' },
    { label: 'Français', value: 'fr' }
  ];
  readonly currentUser: AuthUser | null = this.authService.getCurrentUser();

  constructor(
    private readonly authService: AuthService,
    readonly i18nService: I18nService
  ) {}

  get displayName(): string {
    return this.currentUser?.name || 'PetLife User';
  }

  get displayRole(): string {
    return this.currentUser?.role || 'Customer';
  }

  get navItems(): NavItem[] {
    return this.isProvider ? this.providerNavItems : this.customerNavItems;
  }

  get isProvider(): boolean {
    return (this.currentUser?.role || '').toLowerCase().includes('provider');
  }

  logout(): void {
    this.authService.logout();
  }

  changeLanguage(language: AppLanguage): void {
    this.i18nService.useLanguage(language);
  }
}
