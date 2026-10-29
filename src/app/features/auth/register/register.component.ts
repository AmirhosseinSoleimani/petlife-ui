import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/api-error.util';
import { AuthService } from '../../../core/auth/auth.service';
import { meetsPasswordPolicy } from '../../../core/auth/password-policy';
import { RegisterAccountRequest } from '../../../core/models/auth.models';

type AccountType = 'customer' | 'provider';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  readonly accountType: AccountType;
  firstName = '';
  lastName = '';
  email = '';
  mobileNumber = '';
  password = '';
  confirmPassword = '';
  isSubmitting = false;
  registrationComplete = false;
  showErrors = false;
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    route: ActivatedRoute
  ) {
    this.accountType = route.snapshot.data['accountType'] === 'provider' ? 'provider' : 'customer';
  }

  get validEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim()) && this.email.trim().length <= 320;
  }

  get validMobile(): boolean {
    const mobile = this.mobileNumber.trim();
    const digits = mobile.replace(/\D/g, '');
    return /^[+\d\s()\-]+$/.test(mobile) && digits.length >= 8 && digits.length <= 15;
  }

  get validPassword(): boolean {
    return meetsPasswordPolicy(this.password);
  }

  get validName(): boolean {
    return this.firstName.trim().length > 0 && this.firstName.trim().length <= 100
      && this.lastName.trim().length > 0 && this.lastName.trim().length <= 100;
  }

  get validForm(): boolean {
    return this.validName && this.validEmail && this.validMobile
      && this.validPassword && this.password === this.confirmPassword;
  }

  register(): void {
    if (this.isSubmitting || this.registrationComplete) return;
    this.showErrors = true;
    this.errorMessage = '';
    if (!this.validForm) return;

    const request: RegisterAccountRequest = {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim(),
      mobileNumber: this.mobileNumber.trim(),
      password: this.password,
      confirmPassword: this.confirmPassword
    };

    this.isSubmitting = true;
    const action = this.accountType === 'provider'
      ? this.authService.registerProvider(request)
      : this.authService.registerCustomer(request);
    action.subscribe({
      next: response => {
        this.isSubmitting = false;
        if (!response.success) {
          this.errorMessage = response.error?.message || 'auth.registerError';
          return;
        }
        this.password = '';
        this.confirmPassword = '';
        this.registrationComplete = true;
      },
      error: error => {
        this.errorMessage = apiErrorMessage(error, 'auth.registerError');
        this.isSubmitting = false;
      }
    });
  }
}
