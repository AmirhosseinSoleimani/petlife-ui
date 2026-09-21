import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthResponseData, AuthResultCode, LoginResponse } from '../../../core/models/auth.models';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const data: AuthResponseData = {
    token: 'token',
    userId: 'user-1',
    firstName: 'Ari',
    lastName: 'Taylor',
    role: 'Customer',
    status: 'Active',
    isEmailVerified: false,
    isMobileVerified: false
  };

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'getPostAuthRoute']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    component = new LoginComponent(authService, router, {} as I18nService);
    component.credentials = { identifier: 'ari@example.com', password: 'Strong#123' };
  });

  it('routes a successful RC0 response using the role/status destination', () => {
    const response: LoginResponse = { success: true, resultCode: AuthResultCode.Success, data, error: {} };
    authService.login.and.returnValue(of(response));
    authService.getPostAuthRoute.and.returnValue(['/dashboard']);

    component.login();

    expect(authService.login).toHaveBeenCalledWith(component.credentials);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.errorMessage).toBe('');
    expect(component.isSubmitting).toBeFalse();
  });

  it('routes a Pending Provider to Pending Approval', () => {
    const response: LoginResponse = {
      success: true,
      resultCode: AuthResultCode.Success,
      data: { ...data, role: 'Provider', status: 'Pending' },
      error: {}
    };
    authService.login.and.returnValue(of(response));
    authService.getPostAuthRoute.and.returnValue(['/provider/pending-approval']);

    component.login();

    expect(router.navigate).toHaveBeenCalledWith(['/provider/pending-approval']);
  });

  it('shows the server message for RC1 without navigating', () => {
    authService.login.and.returnValue(of({
      success: false,
      resultCode: AuthResultCode.BusinessOrValidationError,
      data: {} as AuthResponseData,
      error: { message: 'Invalid login identifier or password.', fieldErrors: {} }
    }));

    component.login();

    expect(component.errorMessage).toBe('Invalid login identifier or password.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('uses the safe generic message and trace ID for RC4', () => {
    authService.login.and.returnValue(of({
      success: false,
      resultCode: AuthResultCode.UnhandledError,
      data: {} as AuthResponseData,
      error: { message: 'Technical exception details', traceId: 'trace-4', fieldErrors: {} }
    }));

    component.login();

    expect(component.errorMessage).toBe('errors.server');
    expect(component.errorTraceId).toBe('trace-4');
    expect(component.errorMessage).not.toContain('Technical');
  });
});
