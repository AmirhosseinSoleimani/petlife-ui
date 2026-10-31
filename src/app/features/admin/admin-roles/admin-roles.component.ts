import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AdminOperation, AdminRole } from '../../../core/models/admin.models';

@Component({
  selector: 'app-admin-roles',
  templateUrl: './admin-roles.component.html',
  styleUrls: ['./admin-roles.component.scss']
})
export class AdminRolesComponent implements OnInit {
  roles: AdminRole[] = [];
  operations: AdminOperation[] = [];
  selected: AdminRole | null = null;
  granted = new Set<string>();
  name = '';
  busy = false;
  loading = false;
  error = '';
  success = '';
  private readonly endpoint = '/v1/identity/management';

  constructor(private readonly api: ApiService) {}
  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading = true; this.error = '';
    forkJoin({
      roles: this.api.get<ApiResponse<AdminRole[]>>(`${this.endpoint}/roles`),
      operations: this.api.get<ApiResponse<AdminOperation[]>>(`${this.endpoint}/operations`)
    }).subscribe({
      next: result => {
        this.roles = result.roles.data || [];
        this.operations = result.operations.data || [];
        this.loading = false;
        if (this.selected) {
          const current = this.roles.find(role => role.id === this.selected?.id);
          if (current) this.select(current); else this.selected = null;
        }
      },
      error: err => { this.error = this.message(err); this.loading = false; }
    });
  }

  select(role: AdminRole): void {
    this.selected = role; this.name = role.name; this.granted.clear(); this.error = '';
    this.api.get<ApiResponse<string[]>>(`${this.endpoint}/roles/${role.id}/operations`).subscribe({
      next: result => this.granted = new Set(result.data || []),
      error: err => this.error = this.message(err)
    });
  }

  create(): void {
    const name = this.name.trim();
    if (!name || this.busy) return;
    this.busy = true; this.error = ''; this.success = '';
    this.api.post<ApiResponse<AdminRole>>(`${this.endpoint}/roles`, { name }).subscribe({
      next: () => { this.busy = false; this.name = ''; this.success = 'Role created.'; this.reload(); },
      error: err => { this.busy = false; this.error = this.message(err); }
    });
  }

  rename(): void {
    if (!this.selected || !this.name.trim() || this.busy) return;
    this.busy = true; this.error = ''; this.success = '';
    this.api.put<ApiResponse<AdminRole>>(`${this.endpoint}/roles/${this.selected.id}/name`, { name: this.name.trim() }).subscribe({
      next: () => { this.busy = false; this.success = 'Role renamed.'; this.reload(); },
      error: err => { this.busy = false; this.error = this.message(err); }
    });
  }

  setActive(active: boolean): void {
    if (!this.selected || this.busy || !window.confirm(`Change status of ${this.selected.name}?`)) return;
    this.busy = true; this.error = ''; this.success = '';
    this.api.put<ApiResponse<AdminRole>>(`${this.endpoint}/roles/${this.selected.id}/status`, { isActive: active }).subscribe({
      next: () => { this.busy = false; this.success = 'Role status updated.'; this.reload(); },
      error: err => { this.busy = false; this.error = this.message(err); }
    });
  }

  toggle(operation: AdminOperation): void {
    if (!this.selected || this.busy || !operation.isActive || this.selected.key.toLowerCase() === 'admin') return;
    const assigned = this.granted.has(operation.id);
    this.busy = true; this.error = ''; this.success = '';
    const url = `${this.endpoint}/roles/${this.selected.id}/operations/${operation.id}`;
    const request = assigned ? this.api.delete<void>(url) : this.api.put<void>(url, {});
    request.subscribe({
      next: () => {
        this.busy = false; this.success = 'Permission saved.';
        this.select(this.selected!);
      },
      error: err => { this.busy = false; this.error = this.message(err); }
    });
  }

  private message(err: any): string {
    const status = err?.status;
    return status === 403 ? 'Your account lacks the required RBAC permission.'
      : status === 404 ? 'Admin API route not found. Verify Gateway:IncludeAdminRoutes and Nginx routing.'
      : err?.error?.error?.message || err?.error?.message || 'Unable to complete this action.';
  }
}
