import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { AppLanguage, I18nService } from '../../../core/i18n/i18n.service';
import { LoginRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  credentials: LoginRequest = {
    email: '',
    password: ''
  };
  readonly languageOptions: Array<{ label: string; value: AppLanguage }> = [
    { label: 'English', value: 'en' },
    { label: 'فارسی', value: 'fa' },
    { label: 'Français', value: 'fr' }
  ];
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    readonly i18nService: I18nService
  ) {}

  login(): void {
    this.isSubmitting = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.errorMessage = 'Unable to sign in with the provided credentials.';
        this.isSubmitting = false;
      }
    });
  }

  changeLanguage(language: AppLanguage): void {
    this.i18nService.useLanguage(language);
  }
}
