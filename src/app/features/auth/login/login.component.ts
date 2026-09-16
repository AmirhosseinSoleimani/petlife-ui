import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/api-error.util';
import { AuthService } from '../../../core/auth/auth.service';
import { AppLanguage, I18nService, SUPPORTED_LANGUAGES } from '../../../core/i18n/i18n.service';
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
  readonly languageOptions = SUPPORTED_LANGUAGES;
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
      error: (error) => {
        this.errorMessage = apiErrorMessage(error, 'auth.loginError');
        this.isSubmitting = false;
      }
    });
  }

  changeLanguage(language: AppLanguage): void {
    this.i18nService.useLanguage(language);
  }
}
