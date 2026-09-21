import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { AdminUser } from '../../../core/models/admin.models';
import { AdminUsersComponent } from './admin-users.component';

describe('AdminUsersComponent Provider approval', () => {
  let component: AdminUsersComponent;
  let http: HttpTestingController;

  const pendingProvider = (): AdminUser => ({
    id: 'provider-1',
    firstName: 'Ari',
    lastName: 'Taylor',
    email: 'ari@example.com',
    role: 'Provider',
    status: 'Pending',
    isEmailVerified: true,
    isMobileVerified: true,
    petCount: 0,
    createdAt: '2026-09-21T00:00:00Z'
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiService,
        AdminUsersComponent,
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ role: 'Provider', status: 'Pending' }) } }
        }
      ]
    });
    component = TestBed.inject(AdminUsersComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the Pending Provider workflow from notification query parameters', () => {
    component.ngOnInit();

    const request = http.expectOne((item) => item.url.includes('/admin/users?'));
    expect(request.request.url).toContain('role=Provider');
    expect(request.request.url).toContain('status=Pending');
    request.flush({
      success: true,
      data: { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 }
    });

    expect(component.role).toBe('Provider');
    expect(component.status).toBe('Pending');
  });

  it('shows Approve only for a Pending Provider', () => {
    expect(component.canApproveProvider(pendingProvider())).toBeTrue();
    expect(component.canApproveProvider({ ...pendingProvider(), role: 'Customer' })).toBeFalse();
    expect(component.canApproveProvider({ ...pendingProvider(), status: 'Active' })).toBeFalse();
  });

  it('waits for server confirmation before changing status to Active', () => {
    const user = pendingProvider();
    component.approveProvider(user);

    const request = http.expectOne((item) => item.url.endsWith('/admin/users/provider-1/status'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ status: 'Active', reason: '' });
    expect(user.status).toBe('Pending');

    request.flush({ success: true, data: { ...user, status: 'Active' } });

    expect(user.status).toBe('Active');
    expect(component.canApproveProvider(user)).toBeFalse();
    expect(component.actionUserId).toBeNull();
  });

  it('keeps Pending status and exposes the server error when approval fails', () => {
    const user = pendingProvider();
    component.approveProvider(user);

    http.expectOne((item) => item.url.endsWith('/admin/users/provider-1/status'))
      .flush({ success: false, message: 'Provider cannot be approved.', data: user });

    expect(user.status).toBe('Pending');
    expect(component.errorMessage).toBe('Provider cannot be approved.');
  });

  it('preserves the existing Activate transition for suspended users', () => {
    const user = { ...pendingProvider(), status: 'Suspended' };
    component.activate(user);

    const request = http.expectOne((item) => item.url.endsWith('/admin/users/provider-1/status'));
    expect(request.request.body).toEqual({ status: 'Active', reason: '' });
    request.flush({ success: true, data: { ...user, status: 'Active' } });

    expect(user.status).toBe('Active');
  });
});
