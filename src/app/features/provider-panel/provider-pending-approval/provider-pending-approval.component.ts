import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/api-error.util';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthUser } from '../../../core/models/auth.models';

@Component({
  selector: 'app-provider-pending-approval',
  templateUrl: './provider-pending-approval.component.html',
  styleUrls: ['./provider-pending-approval.component.scss']
})
export class ProviderPendingApprovalComponent implements OnInit {
  currentUser: AuthUser | null = null;
  isRefreshing = false;
  errorMessage = '';

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  refreshStatus(): void {
    this.isRefreshing = true;
    this.errorMessage = '';

    this.authService.refreshCurrentUser().subscribe({
      next: (response) => {
        this.isRefreshing = false;
        if (!response.success) {
          this.errorMessage = response.message || 'providerPending.refreshError';
          return;
        }

        this.currentUser = this.authService.getCurrentUser();
        if (!this.authService.isPendingProvider(this.currentUser)) {
          void this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        this.errorMessage = apiErrorMessage(error, 'providerPending.refreshError');
        this.isRefreshing = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
