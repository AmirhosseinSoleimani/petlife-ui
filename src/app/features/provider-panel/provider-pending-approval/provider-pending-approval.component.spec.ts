import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthUser } from '../../../core/models/auth.models';
import { ProviderPendingApprovalComponent } from './provider-pending-approval.component';

describe('ProviderPendingApprovalComponent', () => {
  let component: ProviderPendingApprovalComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const pendingUser: AuthUser = { id: 'provider-1', role: 'Provider', status: 'Pending' };
  const activeUser: AuthUser = { ...pendingUser, status: 'Active' };

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getCurrentUser',
      'refreshCurrentUser',
      'isPendingProvider',
      'logout'
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    authService.getCurrentUser.and.returnValue(pendingUser);
    component = new ProviderPendingApprovalComponent(authService, router);
    component.ngOnInit();
  });

  it('shows the current Pending status on initialization', () => {
    expect(component.currentUser).toEqual(pendingUser);
  });

  it('rechecks status and enters the workspace after activation', () => {
    authService.refreshCurrentUser.and.returnValue(of({ success: true, data: activeUser }));
    authService.getCurrentUser.and.returnValue(activeUser);
    authService.isPendingProvider.and.returnValue(false);

    component.refreshStatus();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.isRefreshing).toBeFalse();
  });

  it('keeps the Provider on the page while approval is still Pending', () => {
    authService.refreshCurrentUser.and.returnValue(of({ success: true, data: pendingUser }));
    authService.isPendingProvider.and.returnValue(true);

    component.refreshStatus();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.currentUser?.status).toBe('Pending');
  });

  it('uses the shared error state when refresh fails', () => {
    authService.refreshCurrentUser.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 500,
      error: { message: 'Unable to check status.' }
    })));

    component.refreshStatus();

    expect(component.errorMessage).toBe('Unable to check status.');
    expect(component.isRefreshing).toBeFalse();
  });

  it('logs out through AuthService', () => {
    component.logout();
    expect(authService.logout).toHaveBeenCalled();
  });
});
