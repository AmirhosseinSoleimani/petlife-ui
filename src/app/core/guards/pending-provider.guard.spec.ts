import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { AuthService } from '../auth/auth.service';
import { PendingProviderGuard } from './pending-provider.guard';

describe('PendingProviderGuard', () => {
  let guard: PendingProviderGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isPendingProvider']);
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [PendingProviderGuard, { provide: AuthService, useValue: authService }]
    });
    guard = TestBed.inject(PendingProviderGuard);
    router = TestBed.inject(Router);
  });

  it('redirects a Pending Provider away from the operational app shell', () => {
    authService.isPendingProvider.and.returnValue(true);

    const result = guard.canActivateChild();

    expect(router.serializeUrl(result as UrlTree)).toBe('/provider/pending-approval');
  });

  it('allows Customers, Admins, and active Providers through unchanged', () => {
    authService.isPendingProvider.and.returnValue(false);

    expect(guard.canActivateChild()).toBeTrue();
  });

  it('allows only Pending Providers onto the pending-only page', () => {
    const route = { data: { pendingApprovalOnly: true } } as unknown as ActivatedRouteSnapshot;
    authService.isPendingProvider.and.returnValue(true);
    expect(guard.canActivate(route)).toBeTrue();

    authService.isPendingProvider.and.returnValue(false);
    const result = guard.canActivate(route);
    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });
});
