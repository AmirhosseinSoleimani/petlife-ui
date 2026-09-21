import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthResultCode, LoginResponse, RegisterRequest } from '../../../core/models/auth.models';

type RegistrationRole = 'Customer' | 'Provider';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  role: RegistrationRole = 'Customer';
  firstName = '';
  lastName = '';
  email = '';
  mobileNumber = '';
  password = '';
  confirmPassword = '';
  isSubmitting = false;
  errorMessage = '';
  errorTraceId = '';

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  setRole(role: RegistrationRole): void {
    if (this.role === role) return;
    this.role = role;
    this.errorMessage = '';
    this.errorTraceId = '';
  }

  register(): void {
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.errorTraceId = '';

    const request = this.registrationRequest();
    const registration = this.role === 'Customer'
      ? this.authService.registerCustomer(request)
      : this.authService.registerProvider(request);

    registration.subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (this.isSuccessful(response)) {
          void this.router.navigate(this.authService.getPostAuthRoute(response.data));
          return;
        }

        this.errorMessage = response.resultCode === AuthResultCode.UnhandledError
          ? 'errors.server'
          : response.error?.message || 'Unable to create account.';
        this.errorTraceId = response.error?.traceId || '';
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'Unable to create account.';
        this.isSubmitting = false;
      }
    });
  }

  private registrationRequest(): RegisterRequest {
    return {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email.trim(),
      mobileNumber: this.mobileNumber.trim(),
      password: this.password,
      confirmPassword: this.confirmPassword
    };
  }

  private isSuccessful(response: LoginResponse): boolean {
    return response.success === true
      && response.resultCode === AuthResultCode.Success
      && !!response.data?.token;
  }
}
