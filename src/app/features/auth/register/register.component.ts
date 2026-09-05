import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { RegisterCustomerMobileRequest, RegisterCustomerRequest } from '../../../core/models/auth.models';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  mode: 'email' | 'mobile' = 'email';
  firstName = '';
  lastName = '';
  email = '';
  mobileNumber = '';
  password = '';
  confirmPassword = '';
  isSubmitting = false;
  errorMessage = '';

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  register(): void {
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const request = this.mode === 'email'
      ? this.authService.registerCustomer(this.emailRequest())
      : this.authService.registerCustomerMobile(this.mobileRequest());

    request.subscribe({
      next: () => {
        const channel = this.mode === 'email' ? 'Email' : 'Mobile';
        this.authService.sendVerification(channel).subscribe({
          next: () => this.router.navigate(['/verify-contact'], { queryParams: { channel } }),
          error: () => this.router.navigate(['/verify-contact'], { queryParams: { channel } })
        });
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'Unable to create account.';
        this.isSubmitting = false;
      }
    });
  }

  private emailRequest(): RegisterCustomerRequest {
    return {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      mobileNumber: this.mobileNumber,
      password: this.password
    };
  }

  private mobileRequest(): RegisterCustomerMobileRequest {
    return {
      firstName: this.firstName,
      lastName: this.lastName,
      mobileNumber: this.mobileNumber,
      email: this.email || undefined,
      password: this.password
    };
  }
}
