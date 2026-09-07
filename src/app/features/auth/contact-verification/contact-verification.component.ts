import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ContactVerificationChannel, ContactVerificationStatus } from '../../../core/models/auth.models';

@Component({
  selector: 'app-contact-verification',
  templateUrl: './contact-verification.component.html',
  styleUrls: ['./contact-verification.component.scss']
})
export class ContactVerificationComponent implements OnInit {
  channel: ContactVerificationChannel = 'Email';
  code = '';
  status: ContactVerificationStatus | null = null;
  isLoading = false;
  isSending = false;
  isVerifying = false;
  message = '';
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const requestedChannel = this.route.snapshot.queryParamMap.get('channel');
    this.channel = requestedChannel === 'Mobile' ? 'Mobile' : 'Email';
    this.loadStatus();
  }

  get destination(): string {
    return this.channel === 'Email' ? (this.status?.email || '') : (this.status?.mobileNumber || '');
  }

  get verified(): boolean {
    return this.channel === 'Email' ? !!this.status?.isEmailVerified : !!this.status?.isMobileVerified;
  }

  get canVerify(): boolean {
    return /^\d{6}$/.test(this.code.trim());
  }

  loadStatus(): void {
    this.isLoading = true;
    this.authService.getVerificationStatus().subscribe({
      next: (response) => {
        this.status = response.data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load verification status.';
        this.isLoading = false;
      }
    });
  }

  setChannel(channel: ContactVerificationChannel): void {
    this.channel = channel;
    this.code = '';
    this.message = '';
    this.errorMessage = '';
  }

  sendCode(): void {
    this.isSending = true;
    this.message = '';
    this.errorMessage = '';
    this.authService.sendVerification(this.channel).subscribe({
      next: (response) => {
        this.status = response.data;
        this.message = response.message || 'Verification code sent.';
        this.isSending = false;
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'Unable to send verification code.';
        this.isSending = false;
      }
    });
  }

  verify(): void {
    this.isVerifying = true;
    this.message = '';
    this.errorMessage = '';
    this.authService.verifyContact(this.channel, this.code).subscribe({
      next: (response) => {
        this.status = response.data;
        this.message = response.message || 'Contact verified.';
        this.isVerifying = false;
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'Verification failed.';
        this.isVerifying = false;
      }
    });
  }

  continue(): void {
    this.router.navigate(['/dashboard']);
  }
}
