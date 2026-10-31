import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { AdminRole, AdminUser, PagedResult } from '../../../core/models/admin.models';
import { ApiResponse } from '../../../core/models/api-response.model';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  users: AdminUser[] = [];
  availableRoles: AdminRole[] = [];
  selectedUser: AdminUser | null = null;
  suspendUser: AdminUser | null = null;
  suspensionReason = '';
  search = '';
  role = '';
  status = '';
  page = 1;
  pageSize = 20;
  totalPages = 0;
  totalCount = 0;
  isLoading = false;
  isDetailLoading = false;
  actionUserId: string | null = null;
  errorMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.get<ApiResponse<AdminRole[]>>('/v1/identity/management/roles').subscribe({
      next: response => {
        this.availableRoles = response.data || [];
        this.load(true);
      },
      error: () => this.load(true)
    });
  }

  get hasFilters(): boolean {
    return !!(this.search.trim() || this.role || this.status);
  }

  load(resetPage = false): void {
    if (resetPage) {
      this.page = 1;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const params = new URLSearchParams();
    if (this.search.trim()) params.set('search', this.search.trim());
    if (this.role) {
      const roleId = this.availableRoles.find(r => r.name.toLowerCase() === this.role.toLowerCase())?.id;
      if (roleId) params.set('roleId', roleId);
      else {
        this.errorMessage = 'Unable to resolve the selected role. Reload the page.';
        this.isLoading = false;
        return;
      }
    }
    if (this.status) params.set('status', this.status);
    params.set('page', String(this.page));
    params.set('pageSize', String(this.pageSize));

    this.apiService.get<ApiResponse<PagedResult<AdminUser>>>(`/v1/identity/management/users/search?${params.toString()}`).subscribe({
      next: (response) => {
        this.users = response.data?.items || [];
        this.totalPages = response.data?.totalPages || 0;
        this.totalCount = response.data?.totalCount || 0;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load users.';
        this.isLoading = false;
      }
    });
  }

  clearFilters(): void {
    this.search = '';
    this.role = '';
    this.status = '';
    this.load(true);
  }

  viewUser(user: AdminUser): void {
    this.selectedUser = user;
    this.isDetailLoading = true;
    this.apiService.get<ApiResponse<AdminUser>>(`/v1/identity/management/users/${user.id}/profile`).subscribe({
      next: (response) => {
        if (response.data) {
          this.selectedUser = response.data;
        }
        this.isDetailLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load user details.';
        this.isDetailLoading = false;
      }
    });
  }

  closeDetail(): void {
    this.selectedUser = null;
    this.isDetailLoading = false;
  }

  requestSuspend(user: AdminUser): void {
    this.suspendUser = user;
    this.suspensionReason = '';
  }

  closeSuspendDialog(): void {
    if (this.actionUserId) {
      return;
    }
    this.suspendUser = null;
    this.suspensionReason = '';
  }

  confirmSuspend(): void {
    if (!this.suspendUser || !this.suspensionReason.trim()) {
      return;
    }
    this.updateStatus(this.suspendUser, 'Suspended', this.suspensionReason.trim(), true);
  }

  activate(user: AdminUser): void {
    this.updateStatus(user, 'Active', '');
  }

  previous(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.load();
    }
  }

  next(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
      this.load();
    }
  }

  private updateStatus(user: AdminUser, status: 'Active' | 'Suspended', reason: string, closeSuspendOnSuccess = false): void {
    this.actionUserId = user.id;
    this.errorMessage = '';
    this.apiService.put<ApiResponse<AdminUser>>(`/v1/identity/management/users/${user.id}/status`, { status }).subscribe({
      next: (response) => {
        if (response.data) {
          Object.assign(user, response.data);
          if (this.selectedUser?.id === user.id) {
            this.selectedUser = { ...response.data };
          }
        }
        this.actionUserId = null;
        if (closeSuspendOnSuccess) {
          this.suspendUser = null;
          this.suspensionReason = '';
        }
      },
      error: (error: { error?: { message?: string } }) => {
        this.errorMessage = error.error?.message || 'Unable to update user status.';
        this.actionUserId = null;
      }
    });
  }
}
