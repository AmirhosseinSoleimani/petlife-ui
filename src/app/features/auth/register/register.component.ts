import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import {
  PASSWORD_POLICY_RULES,
  PasswordPolicyRule,
  passwordMeetsPolicy,
  passwordPolicyState
} from '../../../core/auth/password-policy';
import { AuthResultCode, LoginResponse, RegisterRequest } from '../../../core/models/auth.models';

type RegistrationRole = 'Customer' | 'Provider';
type RegistrationField = keyof RegisterRequest;

const REGISTRATION_FIELDS: readonly RegistrationField[] = [
  'firstName',
  'lastName',
  'mobileNumber',
  'email',
  'password',
  'confirmPassword'
];

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
  serverFieldErrors: Partial<Record<RegistrationField, string>> = {};
  showClientValidation = false;
  readonly passwordRules = PASSWORD_POLICY_RULES;

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  setRole(role: RegistrationRole): void {
    if (this.role === role) return;
    this.role = role;
    this.clearServerErrors();
  }

  register(): void {
    this.showClientValidation = true;
    this.clearServerErrors();

    if (!this.passwordIsValid || !this.passwordsMatch) {
      return;
    }

    this.isSubmitting = true;

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
        this.mapServerFieldErrors(response.error?.fieldErrors);
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'Unable to create account.';
        this.isSubmitting = false;
      }
    });
  }

  get passwordIsValid(): boolean {
    return passwordMeetsPolicy(this.password);
  }

  get passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  get confirmPasswordError(): string {
    if (this.serverFieldErrors.confirmPassword) return this.serverFieldErrors.confirmPassword;
    return this.showClientValidation && !this.passwordsMatch ? 'auth.passwordMismatch' : '';
  }

  fieldError(field: RegistrationField): string {
    return this.serverFieldErrors[field] || '';
  }

  passwordRuleIsMet(rule: PasswordPolicyRule): boolean {
    return passwordPolicyState(this.password)[rule.id];
  }

  clearFieldError(field: RegistrationField): void {
    if (this.serverFieldErrors[field]) {
      const nextErrors = { ...this.serverFieldErrors };
      delete nextErrors[field];
      this.serverFieldErrors = nextErrors;
    }
    this.errorMessage = '';
    this.errorTraceId = '';
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

  private clearServerErrors(): void {
    this.serverFieldErrors = {};
    this.errorMessage = '';
    this.errorTraceId = '';
  }

  private mapServerFieldErrors(fieldErrors: Record<string, string[]> | undefined): void {
    if (!fieldErrors) return;

    this.serverFieldErrors = Object.entries(fieldErrors)
      .reduce<Partial<Record<RegistrationField, string>>>((result, [serverField, messages]) => {
        const field = REGISTRATION_FIELDS.find((item) => item.toLowerCase() === serverField.toLowerCase());
        const message = (messages || []).filter(Boolean).join(' ').trim();
        if (field && message) result[field] = message;
        return result;
      }, {});
  }
}
