import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/api-error.util';
import { AuthService } from '../../../core/auth/auth.service';
import { AppLanguage, I18nService, SUPPORTED_LANGUAGES } from '../../../core/i18n/i18n.service';
import { AuthResultCode, LoginRequest, LoginResponse } from '../../../core/models/auth.models';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  credentials: LoginRequest = {
    identifier: '',
    password: ''
  };
  readonly languageOptions = SUPPORTED_LANGUAGES;
  isSubmitting = false;
  errorMessage = '';
  errorTraceId = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    readonly i18nService: I18nService
  ) {}

  login(): void {
    this.isSubmitting = true;
    this.errorMessage = '';
    this.errorTraceId = '';

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (this.isSuccessful(response)) {
          void this.router.navigate(this.authService.getPostAuthRoute(response.data));
          return;
        }

        this.errorMessage = response.resultCode === AuthResultCode.UnhandledError
          ? 'errors.server'
          : response.error?.message || 'auth.loginError';
        this.errorTraceId = response.error?.traceId || '';
      },
      error: (error) => {
        this.errorMessage = apiErrorMessage(error, 'auth.loginError');
        this.isSubmitting = false;
      }
    });
  }

  changeLanguage(language: AppLanguage): void {
    this.i18nService.useLanguage(language);
  }

  private isSuccessful(response: LoginResponse): boolean {
    return response.success === true
      && response.resultCode === AuthResultCode.Success
      && !!response.data?.token;
  }
}
